from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import List, Optional
import os
import jwt

APP_NAME = os.getenv("APP_NAME", "MyFit Pro API")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app = FastAPI(title=APP_NAME, version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: str


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    goal: str


class StudentOut(BaseModel):
    id: int
    trainer_id: int
    name: str
    email: EmailStr
    goal: str
    active: bool = True
    birth_date: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    created_at: str


now_iso = lambda: datetime.utcnow().isoformat(timespec="seconds")

trainer = {
    "id": 1,
    "name": "Alessandro Torres",
    "email": "trainer@myfit.pro",
    "role": "trainer",
    "password": "123456",
    "created_at": now_iso(),
}

students_db: List[StudentOut] = [
    StudentOut(
        id=101,
        trainer_id=1,
        name="Marina Souza",
        email="marina@myfit.pro",
        goal="Hipertrofia",
        active=True,
        weight=62.0,
        height=1.66,
        created_at=now_iso(),
    ),
    StudentOut(
        id=102,
        trainer_id=1,
        name="Rafael Lima",
        email="rafael@myfit.pro",
        goal="Emagrecimento",
        active=True,
        weight=88.0,
        height=1.79,
        created_at=now_iso(),
    ),
    StudentOut(
        id=103,
        trainer_id=1,
        name="Juliana Prado",
        email="juliana@myfit.pro",
        goal="Longevidade",
        active=True,
        weight=70.0,
        height=1.72,
        created_at=now_iso(),
    ),
]


def create_token(user: dict) -> str:
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc


def get_current_user(credentials: str = Depends(lambda: None)):
    header = credentials
    if header is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente")
    if not hasattr(header, "split"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Header inválido")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Formato de token inválido")
    payload = decode_token(token)
    if payload.get("email") == trainer["email"]:
        return trainer
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não autorizado")


@app.get("/health")
def health():
    return {"status": "ok", "app": APP_NAME}


@app.post("/api/v1/auth/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username
    password = form_data.password
    if email == trainer["email"] and password == trainer["password"]:
        token = create_token(trainer)
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")


@app.get("/api/v1/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )


@app.get("/api/v1/students", response_model=List[StudentOut])
def list_students(current_user: dict = Depends(get_current_user)):
    return students_db


@app.post("/api/v1/students", response_model=StudentOut)
def create_student(payload: StudentCreate, current_user: dict = Depends(get_current_user)):
    new_id = max((s.id for s in students_db), default=100) + 1
    item = StudentOut(
        id=new_id,
        trainer_id=current_user["id"],
        name=payload.name,
        email=payload.email,
        goal=payload.goal,
        active=True,
        created_at=now_iso(),
    )
    students_db.append(item)
    return item


@app.get("/")
def root():
    return {"message": "MyFit Pro API funcionando."}
