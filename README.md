# CodeCrawl

CodeCrawl is a debugging-learning arcade prototype with a FastAPI backend and a Next.js frontend.

## Run locally

Backend:

```bash
cd backend
. .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open http://localhost:3000.