from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse

from app.config import BACKEND_URL, FRONTEND_URL
from app.core.google import oauth
from app.core.mail import send_email
from app.core.reset_tokens import create_reset_token, verify_reset_token
from app.core.security import ALGORITHM, SECRET_KEY, create_access_token, hash_password, verify_password
from app.database import SessionLocal, get_db
from app.models.user import User
from app.models.economy_settings import EconomySettings
from app.schemas.user import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserCreate,
    UserLogin,
)
from app.models.rank_settings import RankSettings
from app.utils.progression import xp_needed_for_level
from app.utils.rank import get_rank, get_rank_payload

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def serialize_user_profile(user: User):
    rank_settings = None
    try:
        rank_settings = user._sa_instance_state.session.query(RankSettings).first()
    except Exception:
        rank_settings = None

    ranked_rank = get_rank_payload(user.ranked_elo or user.elo or 1000, rank_settings)
    unranked_rank = get_rank_payload(user.unranked_elo or 1000, rank_settings)
    fun_rank = get_rank_payload(user.fun_elo or 1000, rank_settings)

    return {
        "id": user.id,
        "email": user.email,
        "pseudo": user.pseudo,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "region": user.region,
        "language": user.language,
        "matchmaking_preferences": user.matchmaking_preferences,
        "player_status": user.player_status,
        "role": user.role,
        "elo": user.elo,
        "rank": ranked_rank["label"],
        "rank_tier": ranked_rank["tier"],
        "rank_division": ranked_rank["division"],
        "ranked_elo": user.ranked_elo,
        "unranked_elo": user.unranked_elo,
        "fun_elo": user.fun_elo,
        "mmr_by_mode": {
            "ranked": {
                "elo": user.ranked_elo,
                "rank": ranked_rank["label"],
            },
            "unranked": {
                "elo": user.unranked_elo,
                "rank": unranked_rank["label"],
            },
            "fun": {
                "elo": user.fun_elo,
                "rank": fun_rank["label"],
            },
        },
        "xp": user.xp,
        "level": user.level,
        "soft_currency": user.soft_currency,
        "hard_currency": user.hard_currency,
        "equipped_avatar_frame": user.equipped_avatar_frame,
        "equipped_title": user.equipped_title,
        "xp_needed_for_next_level": xp_needed_for_level(user.level),
    }


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        email=user.email,
        password=hash_password(user.password),
        pseudo=user.pseudo,
    )

    economy_settings = db.query(EconomySettings).first()
    if economy_settings:
        new_user.soft_currency = economy_settings.starter_soft_currency
        new_user.hard_currency = economy_settings.starter_hard_currency

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "pseudo": new_user.pseudo,
    }


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not db_user.password or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": db_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/token")
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == form_data.username).first()

    if not db_user or not db_user.password or not verify_password(form_data.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": db_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if user and user.is_active:
        token = create_reset_token(user.email)
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        body = (
            "Bonjour,\n\n"
            "Vous avez demande la reinitialisation de votre mot de passe GameDash.\n"
            f"Cliquez sur ce lien pour definir un nouveau mot de passe : {reset_link}\n\n"
            "Ce lien expire dans 1 heure.\n"
            "Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email."
        )
        send_email(user.email, "GameDash - Reinitialisation du mot de passe", body)

    return {
        "message": "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye."
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_token(payload.token)

    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(payload.password)
    db.commit()

    return {"message": "Password reset successful"}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user


@router.get("/google")
async def google_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")

    if not user_info:
        user_info = await oauth.google.userinfo(token=token)

    if not user_info or not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Google account email not available")

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == user_info["email"]).first()

        if not user:
            user = User(
                email=user_info["email"],
                pseudo=user_info.get("name", "google_user"),
                avatar_url=user_info.get("picture"),
                password="",
                role="player",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.avatar_url and user_info.get("picture"):
            user.avatar_url = user_info.get("picture")
            db.commit()

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")

        jwt_token = create_access_token({"sub": user.email})
    finally:
        db.close()

    return RedirectResponse(url=f"{FRONTEND_URL}/oauth-success?token={jwt_token}")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user_profile(current_user)


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


@router.get("/admin")
def admin_only(user: User = Depends(require_admin)):
    return {"message": "Welcome admin"}
