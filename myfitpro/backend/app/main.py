from datetime import datetime, timedelta, timezone
from typing import Annotated
import hashlib
import hmac
import sqlite3
from pathlib import Path

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MyFit Pro API"
    database_url: str = "sqlite:///./myfitpro.db"
    jwt_secret: str = "change-this-secret"
    jwt_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.cors_origins.split(",") if x.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def db_path() -> str:
    if not settings.database_url.startswith("sqlite:///"):
        raise RuntimeError("Use SQLite no desenvolvimento ou implemente o adapter PostgreSQL")
    return settings.database_url.removeprefix("sqlite:///")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db() -> None:
    Path(db_path()).parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('academy','trainer','student')),
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT, trainer_id INTEGER NOT NULL,
          name TEXT NOT NULL, email TEXT NOT NULL, goal TEXT NOT NULL,
          birth_date TEXT, weight REAL, height REAL, active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL, FOREIGN KEY(trainer_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT, trainer_id INTEGER NOT NULL,
          student_id INTEGER, title TEXT NOT NULL, objective TEXT NOT NULL,
          duration INTEGER NOT NULL, exercises INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'Ativo', created_at TEXT NOT NULL,
          FOREIGN KEY(trainer_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS assessments (
          id INTEGER PRIMARY KEY AUTOINCREMENT, trainer_id INTEGER NOT NULL,
          student_id INTEGER NOT NULL, date TEXT NOT NULL, weight REAL NOT NULL,
          body_fat REAL NOT NULL, muscle_mass REAL NOT NULL, status TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(trainer_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS schedule (
          id INTEGER PRIMARY KEY AUTOINCREMENT, trainer_id INTEGER NOT NULL,
          student_id INTEGER NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
          workout_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente',
          FOREIGN KEY(trainer_id) REFERENCES users(id)
        );
        """)
        trainer = conn.execute("SELECT id FROM users WHERE email = ?", ("trainer@myfit.pro",)).fetchone()
        if not trainer:
            conn.execute(
                "INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)",
                ("Alessandro Torres", "trainer@myfit.pro", hash_password("123456"), "trainer", now()),
            )
            trainer_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.executemany(
                "INSERT INTO students(trainer_id,name,email,goal,weight,height,created_at) VALUES(?,?,?,?,?,?,?)",
                [(trainer_id, "Marina Souza", "marina@myfit.pro", "Hipertrofia", 62, 1.66, now()),
                 (trainer_id, "Rafael Lima", "rafael@myfit.pro", "Emagrecimento", 88, 1.79, now()),
                 (trainer_id, "Juliana Prado", "juliana@myfit.pro", "Longevidade", 70, 1.72, now())],
            )
            ids = [row[0] for row in conn.execute("SELECT id FROM students WHERE trainer_id = ? ORDER BY id", (trainer_id,)).fetchall()]
            conn.executemany("INSERT INTO workouts(trainer_id,student_id,title,objective,duration,exercises,created_at) VALUES(?,?,?,?,?,?,?)", [
                (trainer_id, ids[0], "Peito & Tríceps", "Hipertrofia", 45, 8, now()),
                (trainer_id, ids[1], "Costas & Bíceps", "Força", 50, 9, now()),
                (trainer_id, ids[2], "Pernas & Ombros", "Longevidade", 55, 10, now()),
            ])
            conn.executemany("INSERT INTO assessments(trainer_id,student_id,date,weight,body_fat,muscle_mass,status,progress) VALUES(?,?,?,?,?,?,?,?)", [
                (trainer_id, ids[0], "2026-09-26", 62, 18.2, 34.8, "Em progresso", 82),
                (trainer_id, ids[1], "2026-09-20", 87.5, 23.4, 29.1, "Atenção", 68),
                (trainer_id, ids[2], "2026-09-18", 69, 20.7, 31.4, "Excelente", 91),
            ])
            conn.executemany("INSERT INTO schedule(trainer_id,student_id,date,time,workout_type,status) VALUES(?,?,?,?,?,?)", [
                (trainer_id, ids[0], "2026-09-28", "07:00", "Hipertrofia", "Confirmado"),
                (trainer_id, ids[1], "2026-09-28", "18:30", "Emagrecimento", "Pendente"),
                (trainer_id, ids[2], "2026-09-28", "19:30", "Longevidade", "Confirmado"),
            ])


@app.on_event("startup")
def startup() -> None:
    init_db()


def hash_password(password: str) -> str:
    salt = hashlib.sha256(("myfitpro:" + password).encode()).hexdigest()[:32]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt, expected = encoded.split("$", 1)
    except ValueError:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return hmac.compare_digest(actual, expected)


def public_user(row: sqlite3.Row) -> dict:
    return {key: row[key] for key in ("id", "name", "email", "role", "created_at")}


def current_user(token: Annotated[str, Depends(oauth2)]) -> sqlite3.Row:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise unauthorized
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise unauthorized
    return row


def trainer_only(user: Annotated[sqlite3.Row, Depends(current_user)]) -> sqlite3.Row:
    if user["role"] not in ("trainer", "academy"):
        raise HTTPException(status_code=403, detail="Acesso restrito a profissionais")
    return user


class RegisterPayload(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="student", pattern="^(academy|trainer|student)$")


class StudentPayload(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    goal: str = "Condicionamento"
    birth_date: str | None = None
    weight: float | None = Field(default=None, gt=20, lt=350)
    height: float | None = Field(default=None, gt=1, lt=2.5)


class WorkoutPayload(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    objective: str
    duration: int = Field(gt=0, le=300)
    exercises: int = Field(gt=0, le=100)
    student_id: int | None = None


class AssessmentPayload(BaseModel):
    student_id: int
    date: str
    weight: float = Field(gt=20, lt=350)
    body_fat: float = Field(ge=1, le=70)
    muscle_mass: float = Field(ge=1, le=200)
    status: str = "Em progresso"
    progress: int = Field(default=0, ge=0, le=100)


class SchedulePayload(BaseModel):
    student_id: int
    date: str
    time: str
    workout_type: str
    status: str = "Pendente"


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "MyFit Pro API ativa", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


@app.post("/api/v1/auth/register", status_code=201)
def register(payload: RegisterPayload) -> dict:
    try:
        with db() as conn:
            cursor = conn.execute("INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)", (payload.name, str(payload.email).lower(), hash_password(payload.password), payload.role, now()))
            row = conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado") from exc
    return public_user(row)


@app.post("/api/v1/auth/token")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> dict[str, str]:
    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (form.username.lower(),)).fetchone()
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    token = jwt.encode({"sub": str(user["id"]), "role": user["role"], "exp": expires}, settings.jwt_secret, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/v1/me")
def me(user: Annotated[sqlite3.Row, Depends(current_user)]) -> dict:
    return public_user(user)


def list_for_user(table: str, user_id: int) -> list[dict]:
    with db() as conn:
        return [dict(row) for row in conn.execute(f"SELECT * FROM {table} WHERE trainer_id = ? ORDER BY id DESC", (user_id,)).fetchall()]


@app.get("/api/v1/students")
def students(user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> list[dict]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM students WHERE trainer_id = ? ORDER BY name", (user["id"],)).fetchall()
    return [dict(row, active=bool(row["active"])) for row in rows]


@app.post("/api/v1/students", status_code=201)
def create_student(payload: StudentPayload, user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> dict:
    with db() as conn:
        cursor = conn.execute("INSERT INTO students(trainer_id,name,email,goal,birth_date,weight,height,created_at) VALUES(?,?,?,?,?,?,?,?)", (user["id"], payload.name, str(payload.email).lower(), payload.goal, payload.birth_date, payload.weight, payload.height, now()))
        row = conn.execute("SELECT * FROM students WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row, active=bool(row["active"]))


@app.get("/api/v1/workouts")
def workouts(user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> list[dict]:
    return list_for_user("workouts", user["id"])


@app.post("/api/v1/workouts", status_code=201)
def create_workout(payload: WorkoutPayload, user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> dict:
    with db() as conn:
        cursor = conn.execute("INSERT INTO workouts(trainer_id,student_id,title,objective,duration,exercises,created_at) VALUES(?,?,?,?,?,?,?)", (user["id"], payload.student_id, payload.title, payload.objective, payload.duration, payload.exercises, now()))
        row = conn.execute("SELECT * FROM workouts WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@app.get("/api/v1/assessments")
def assessments(user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> list[dict]:
    return list_for_user("assessments", user["id"])


@app.post("/api/v1/assessments", status_code=201)
def create_assessment(payload: AssessmentPayload, user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> dict:
    with db() as conn:
        cursor = conn.execute("INSERT INTO assessments(trainer_id,student_id,date,weight,body_fat,muscle_mass,status,progress) VALUES(?,?,?,?,?,?,?,?)", (user["id"], payload.student_id, payload.date, payload.weight, payload.body_fat, payload.muscle_mass, payload.status, payload.progress))
        row = conn.execute("SELECT * FROM assessments WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@app.get("/api/v1/schedule")
def schedule(user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> list[dict]:
    return list_for_user("schedule", user["id"])


@app.post("/api/v1/schedule", status_code=201)
def create_schedule(payload: SchedulePayload, user: Annotated[sqlite3.Row, Depends(trainer_only)]) -> dict:
    with db() as conn:
        cursor = conn.execute("INSERT INTO schedule(trainer_id,student_id,date,time,workout_type,status) VALUES(?,?,?,?,?,?)", (user["id"], payload.student_id, payload.date, payload.time, payload.workout_type, payload.status))
        row = conn.execute("SELECT * FROM schedule WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)
