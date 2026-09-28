# MyFit Pro

Aplicativo real em evolução para academias, personal trainers e alunos.

## Executar

Terminal 1 — API:

```bash
cd myfitpro/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
cd myfitpro/frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API e Swagger: http://localhost:8000/docs

O frontend usa JWT, carrega o usuário e a carteira de alunos pela API e permite cadastrar novos alunos. O SQLite é adequado somente para desenvolvimento; a próxima migração deve usar PostgreSQL, migrations e gestão de segredos em produção.
