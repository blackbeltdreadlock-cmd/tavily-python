# MyFit Pro

Aplicativo completo para academia, personal trainers e alunos.

## Estrutura

- `myfitpro/frontend`: app web em React + TypeScript + Vite
- `myfitpro/backend`: API em FastAPI com autenticação JWT

## Como iniciar

### Backend

```bash
cd myfitpro/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd myfitpro/frontend
npm install
npm run dev
```

### Acesso

- Frontend: http://localhost:5173
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### Demo

- Email: trainer@myfit.pro
- Senha: 123456

## Próximos passos

- PostgreSQL em produção
- migrações com Alembic
- autenticação real por usuário
- módulos de fichas, avaliações, agenda e financeiro completos
