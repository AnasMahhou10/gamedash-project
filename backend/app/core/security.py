from passlib.context import CryptContext
from jose import jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    password = password.strip()  
    password_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(password_bytes)

def verify_password(plain_password, hashed_password):
    plain_password = plain_password.strip()
    plain_password_bytes = plain_password.encode('utf-8')[:72]
    return pwd_context.verify(plain_password_bytes, hashed_password)
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)