from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.routes.auth import serialize_user_profile
from app.schemas.user import UserProfileUpdate

router = APIRouter()


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return serialize_user_profile(current_user)


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    users = db.query(User).all()
    return [serialize_user_profile(user) for user in users]


@router.get("/{user_id}/pseudo")
def get_user_pseudo(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": target.id, "pseudo": target.pseudo}


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    user.pseudo                  = data.pseudo
    user.avatar_url              = data.avatar_url
    user.bio                     = data.bio
    user.region                  = data.region
    user.language                = data.language
    user.matchmaking_preferences = data.matchmaking_preferences

    db.commit()
    db.refresh(user)
    return serialize_user_profile(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.id != user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}