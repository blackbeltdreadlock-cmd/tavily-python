# MyFit Pro — versão completa do MVP

A aplicação possui frontend React/Vite e API FastAPI com SQLite para desenvolvimento.

## Executar

```bash
# API
cd myfitpro/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# Em outro terminal
cd myfitpro/frontend
npm install
npm run dev
```

Frontend: http://localhost:5173  
Swagger: http://localhost:8000/docs

Credenciais de demonstração: `trainer@myfit.pro` / `123456`.

## Módulos disponíveis

- autenticação JWT;
- dashboard operacional;
- carteira e cadastro de alunos;
- fichas de treino;
- avaliações físicas;
- agenda;
- endpoints REST para criação e consulta.

O banco SQLite é inicializado automaticamente com dados demo. Para produção, configurar PostgreSQL, migrations Alembic, segredo JWT seguro, storage de arquivos, rate limiting e observabilidade.
