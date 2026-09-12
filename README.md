# CodeCrawl

Panic Mode for emergencies. Arcade Mode for learning. Paste messy/buggy code in,
get either an instant clean-code fix, or a 2D platformer where you fight your
own bugs and answer quizzes to squash them.

## Project structure

```
codecrawl/
├── run.bat                 <- double-click this on Windows to launch everything
├── backend/
│   ├── main.py              FastAPI app: /api/analyze, /api/refactor
│   ├── requirements.txt
│   └── .env.example         copy to .env and add your ANTHROPIC_API_KEY
└── frontend/
    ├── app/
    │   ├── page.js           mode switcher + Panic/Arcade UI
    │   ├── layout.js
    │   └── globals.css
    ├── components/
    │   ├── CodeCrawlGame.jsx Phaser platformer wrapper
    │   └── QuizModal.jsx     pause-and-quiz React modal
    ├── package.json
    └── .env.local.example
```

## Requirements

- **Python 3.10+** on PATH (for the backend)
- **Node.js 18+** and npm on PATH (for the frontend)
- (Optional) An Anthropic API key for real AI-generated refactors/quizzes.
  Without one, the app still runs completely, using a deterministic offline
  fallback based on AST-detected bug patterns (bare `except:`, mutable
  default args, `== None`, unguarded `while True`, unguarded division, etc.)

## Quick start (Windows)

1. Double-click **`run.bat`**.
2. On first run it will:
   - create a Python virtualenv in `backend/venv` and install dependencies
   - copy `backend/.env.example` to `backend/.env` (edit this to add your key)
   - install frontend npm packages
   - launch both servers in separate terminal windows
3. Open **http://localhost:3000**.

To add real AI-powered refactors, open `backend/.env` and set:
```
ANTHROPIC_API_KEY=sk-ant-...
```
then restart `run.bat` (or just the backend terminal window).

## Quick start (macOS/Linux, or manual setup)

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optionally add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

**Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

## How it works

- **Panic Mode**: paste code → `Execute Emergency Fix` → calls
  `POST /api/refactor` → shows the cleaned-up code with a copy button.
- **Arcade Mode**: paste code → `Launch Bug Adventure` → calls
  `POST /api/analyze` (AST-based complexity/bug count) and
  `POST /api/refactor` (clean code + quiz questions) → spawns a Phaser.js
  platformer with one enemy per detected bug (plus a boss if complexity is
  high). Colliding with an enemy pauses the game and opens a quiz; answer
  correctly to destroy it. Clear all enemies to see the Victory screen with
  your fully refactored code.

## Troubleshooting the launcher (Windows)

`run.bat` checks its prerequisites and will tell you exactly what's wrong
instead of failing silently:

- **"Python was not found on PATH"** — install Python 3.10+ from
  python.org and check "Add Python to PATH" during install. Restart your
  terminal/computer afterward so PATH changes take effect.
- **"Node.js / npm was not found on PATH"** — install the Node.js 18+ LTS
  installer from nodejs.org, then restart your terminal.
- **"Failed to create the Python virtual environment"** — usually means
  the `python` on your PATH is the Microsoft Store stub. Delete
  `backend\venv`, install real Python from python.org, and run
  `run.bat` again.
- **pip install / npm install fails** — scroll up in that window to read
  the actual error (often a network/proxy issue or a locked file), fix it,
  then re-run `run.bat`.
- Windows may show a SmartScreen warning the first time you run a `.bat`
  file downloaded from the internet — click "More info" → "Run anyway".
- `run.bat` only sets things up and launches two *separate* windows named
  "CodeCrawl Backend" and "CodeCrawl Frontend" — closing the main launcher
  window after it prints the URLs is safe, the two server windows keep
  running independently.

## Notes / known limits (MVP scope)

- Enemies/player are drawn as colored rectangles, not sprite art — easy to
  swap for real sprites later via `this.load.image(...)` in
  `CodeCrawlGame.jsx`.
- The offline fallback's "clean code" just annotates the original — real
  refactoring requires a configured `ANTHROPIC_API_KEY`.
- CORS is wide open (`allow_origins=["*"]`) for local development; tighten
  this before deploying anywhere public.
