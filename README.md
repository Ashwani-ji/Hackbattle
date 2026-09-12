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

<<<<<<< HEAD
Open http://localhost:3000.
=======
Open http://localhost:3000.

All AI features, including refactoring, quiz generation, and multiplayer fix
evaluation, use local Ollama at `http://localhost:11434` with
`qwen2.5-coder:7b-instruct`. Start Ollama and pull the model before testing:

```bash
ollama pull qwen2.5-coder:7b-instruct
```

Multiplayer room server (in a separate terminal):

```bash
cd multiplayer-server
npm install
npm start
```

The frontend connects to `http://localhost:3001` by default. Set
`NEXT_PUBLIC_MULTIPLAYER_URL` in `frontend/.env.local` to use another host.
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)
