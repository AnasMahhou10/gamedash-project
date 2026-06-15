from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import SECRET_KEY
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def _resolve_user(token: str | None, db: Session):
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user = _resolve_user(token, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def get_optional_current_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
):
    return _resolve_user(token, db)


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
