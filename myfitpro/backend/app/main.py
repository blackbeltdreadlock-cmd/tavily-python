from datetime import datetime, timedelta, timezone
from typing import Annotated
import os

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field

APP_NAME = os.getenv("APP_NAME", "MyFit Pro API")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

app = FastAPI(title=APP_NAME, version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

now = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
class User(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: str
class StudentCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    goal: str = "Condicionamento"
class Student(StudentCreate):
    id: int
    trainer_id: int
    active: bool = True
    created_at: str
class WorkoutCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    objective: str = "Hipertrofia"
    duration: int = Field(ge=15, le=300)
    exercises: int = Field(ge=1, le=100)
class Workout(WorkoutCreate):
    id: int
    status: str = "Ativo"
    created_at: str
class Assessment(BaseModel):
    id: int
    student_name: str
    date: str
    weight: float
    body_fat: float
    muscle_mass: float
    status: str
    progress: int
class ScheduleItem(BaseModel):
    id: int
    time: str
    student_name: str
    workout_type: str
    status: str

trainer = {"id":1,"name":"Alessandro Torres","email":"trainer@myfit.pro","role":"trainer","password":"123456","created_at":now()}
students: list[Student] = [
    Student(id=101,trainer_id=1,name="Marina Souza",email="marina@myfit.pro",goal="Hipertrofia",created_at=now()),
    Student(id=102,trainer_id=1,name="Rafael Lima",email="rafael@myfit.pro",goal="Emagrecimento",created_at=now()),
    Student(id=103,trainer_id=1,name="Juliana Prado",email="juliana@myfit.pro",goal="Longevidade",created_at=now()),
]
workouts: list[Workout] = [
    Workout(id=1,title="Peito & Tríceps",objective="Hipertrofia",duration=45,exercises=8,created_at=now()),
    Workout(id=2,title="Costas & Bíceps",objective="Força",duration=50,exercises=9,created_at=now()),
    Workout(id=3,title="Pernas & Ombros",objective="Definição",duration=55,exercises=10,created_at=now()),
]
assessments = [
    Assessment(id=1,student_name="Marina Souza",date="2026-09-26",weight=62,body_fat=18.2,muscle_mass=34.8,status="Em progresso",progress=82),
    Assessment(id=2,student_name="Rafael Lima",date="2026-09-20",weight=87.5,body_fat=23.4,muscle_mass=29.1,status="Atenção",progress=68),
    Assessment(id=3,student_name="Juliana Prado",date="2026-09-18",weight=69,muscle_mass=31.4,body_fat=20.7,status="Excelente",progress=91),
]
schedule = [
    ScheduleItem(id=1,time="07:00",student_name="Marina Souza",workout_type="Hipertrofia",status="Confirmado"),
    ScheduleItem(id=2,time="18:30",student_name="Rafael Lima",workout_type="Emagrecimento",status="Pendente"),
    ScheduleItem(id=3,time="19:30",student_name="Juliana Prado",workout_type="Longevidade",status="Confirmado"),
]

def token_for(user: dict) -> str:
    payload = {"sub":str(user["id"]),"email":user["email"],"role":user["role"],"exp":datetime.now(timezone.utc)+timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou inválido")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
        if payload.get("email") != trainer["email"]: raise ValueError
    except (jwt.PyJWTError, ValueError, IndexError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado") from exc
    return trainer

@app.get("/")
def root(): return {"message":"MyFit Pro API funcionando","docs":"/docs"}
@app.get("/health")
def health(): return {"status":"ok","app":APP_NAME}
@app.post("/api/v1/auth/token", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if form.username.lower() != trainer["email"] or form.password != trainer["password"]:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    return Token(access_token=token_for(trainer))
@app.get("/api/v1/me", response_model=User)
def me(_: Annotated[dict, Depends(current_user)]): return User(**trainer)
@app.get("/api/v1/students", response_model=list[Student])
def list_students(_: Annotated[dict, Depends(current_user)]): return students
@app.post("/api/v1/students", response_model=Student, status_code=201)
def create_student(payload: StudentCreate, _: Annotated[dict, Depends(current_user)]):
    item = Student(id=max((x.id for x in students), default=100)+1,trainer_id=1,**payload.model_dump(),created_at=now())
    students.append(item)
    return item
@app.get("/api/v1/workouts", response_model=list[Workout])
def list_workouts(_: Annotated[dict, Depends(current_user)]): return workouts
@app.post("/api/v1/workouts", response_model=Workout, status_code=201)
def create_workout(payload: WorkoutCreate, _: Annotated[dict, Depends(current_user)]):
    item = Workout(id=max((x.id for x in workouts), default=0)+1,**payload.model_dump(),created_at=now())
    workouts.append(item)
    return item
@app.get("/api/v1/assessments", response_model=list[Assessment])
def list_assessments(_: Annotated[dict, Depends(current_user)]): return assessments
@app.get("/api/v1/schedule", response_model=list[ScheduleItem])
def list_schedule(_: Annotated[dict, Depends(current_user)]): return schedule
