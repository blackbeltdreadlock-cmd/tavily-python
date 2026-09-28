from datetime import datetime, timedelta
from typing import List, Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

APP_NAME = "MyFit Pro API"
JWT_SECRET = "dev-secret-change-me"
JWT_EXPIRE_MINUTES = 1440

app = FastAPI(title=APP_NAME, version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


class WorkoutCreate(BaseModel):
    title: str
    objective: str
    duration: int
    exercises: int


class WorkoutOut(BaseModel):
    id: int
    title: str
    objective: str
    duration: int
    exercises: int
    status: str = "Ativo"
    created_at: str


class AssessmentOut(BaseModel):
    id: int
    student_name: str
    date: str
    weight: float
    body_fat: float
    muscle_mass: float
    status: str
    progress: int


class ScheduleOut(BaseModel):
    id: int
    time: str
    student_name: str
    workout_type: str
    status: str


class SimpleMessage(BaseModel):
    message: str


trainer = {
    "id": 1,
    "name": "Alessandro Torres",
    "email": "trainer@myfit.pro",
    "role": "trainer",
    "password": "123456",
    "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
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
        created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
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
        created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
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
        created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
    ),
]

workouts_db: List[WorkoutOut] = [
    WorkoutOut(id=1, title="Peito & Tríceps", objective="Hipertrofia", duration=45, exercises=8, status="Ativo", created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")),
    WorkoutOut(id=2, title="Costas & Bíceps", objective="Força", duration=50, exercises=9, status="Ativo", created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")),
    WorkoutOut(id=3, title="Pernas & Ombros", objective="Definição", duration=55, exercises=10, status="Ativo", created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")),
]

assessments_db: List[AssessmentOut] = [
    AssessmentOut(id=1, student_name="Marina Souza", date="2026-09-26", weight=62.0, body_fat=18.2, muscle_mass=34.8, status="Em progresso", progress=82),
    AssessmentOut(id=2, student_name="Rafael Lima", date="2026-09-20", weight=87.5, body_fat=23.4, muscle_mass=29.1, status="Atenção", progress=68),
    AssessmentOut(id=3, student_name="Juliana Prado", date="2026-09-18", weight=69.0, body_fat=20.7, muscle_mass=31.4, status="Excelente", progress=91),
]

schedule_db: List[ScheduleOut] = [
    ScheduleOut(id=1, time="07:00", student_name="Marina Souza", workout_type="Hipertrofia", status="Confirmado"),
    ScheduleOut(id=2, time="18:30", student_name="Rafael Lima", workout_type="Emagrecimento", status="Pendente"),
    ScheduleOut(id=3, time="19:30", student_name="Juliana Prado", workout_type="Longevidade", status="Confirmado"),
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


def get_current_user_from_header(authorization: Optional[str] = None):
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Formato de token inválido")
    payload = decode_token(token)
    if payload.get("email") != trainer["email"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não autorizado")
    return trainer


@app.get("/health")
def health():
    return {"status": "ok", "app": APP_NAME}


@app.post("/api/v1/auth/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == trainer["email"] and form_data.password == trainer["password"]:
        return {"access_token": create_token(trainer), "token_type": "bearer"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")


@app.get("/api/v1/me", response_model=UserOut)
def me(authorization: Optional[str] = None):
    user = get_current_user_from_header(authorization)
    return UserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"],
    )


@app.get("/api/v1/students", response_model=List[StudentOut])
def list_students(authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    return students_db


@app.post("/api/v1/students", response_model=StudentOut)
def create_student(payload: StudentCreate, authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    item = StudentOut(
        id=max((student.id for student in students_db), default=100) + 1,
        trainer_id=1,
        name=payload.name,
        email=payload.email,
        goal=payload.goal,
        active=True,
        created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
    )
    students_db.append(item)
    return item


@app.get("/api/v1/workouts", response_model=List[WorkoutOut])
def list_workouts(authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    return workouts_db


@app.post("/api/v1/workouts", response_model=WorkoutOut)
def create_workout(payload: WorkoutCreate, authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    item = WorkoutOut(
        id=max((item.id for item in workouts_db), default=0) + 1,
        title=payload.title,
        objective=payload.objective,
        duration=payload.duration,
        exercises=payload.exercises,
        status="Ativo",
        created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
    )
    workouts_db.append(item)
    return item


@app.get("/api/v1/assessments", response_model=List[AssessmentOut])
def list_assessments(authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    return assessments_db


@app.get("/api/v1/schedule", response_model=List[ScheduleOut])
def list_schedule(authorization: Optional[str] = None):
    get_current_user_from_header(authorization)
    return schedule_db


@app.get("/")
def root():
    return {"message": "MyFit Pro API funcionando."}


@app.get("/api/v1/demo")
def demo():
    return {"email": trainer["email"], "password": trainer["password"]}


@app.post("/api/v1/echo")
def echo(payload: SimpleMessage):
    return {"message": payload.message}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


__all__ = ["app"]
