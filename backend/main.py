"""
CodeCrawl backend — FastAPI service.

Endpoints:
  POST /api/analyze   -> AST-based static analysis (complexity, bug hotspots)
  POST /api/refactor  -> LLM-backed clean code + quiz generation
                          (falls back to an offline heuristic mock if no
                          ANTHROPIC_API_KEY is configured, so the app always
                          runs end-to-end even without a key)
"""

import ast
import json
import os
import re
import subprocess
import sys
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

app = FastAPI(title="CodeCrawl API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # wildcard origin + credentials is rejected by browsers anyway;
                              # we don't use cookies/auth headers so this stays permissive and safe
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CodeInput(BaseModel):
    code: str


class Quiz(BaseModel):
    bug_line: int
    question: str
    options: List[str]
    answer: int


class RefactorResponse(BaseModel):
    clean_code: str
    quizzes: List[Quiz]


class DebugResponse(BaseModel):
    status: str
    stdout: str = ""
    stderr: str = ""
    exit_code: Optional[int] = None


# ---------------------------------------------------------------------------
# /api/analyze  -  static analysis using Python's ast module
# ---------------------------------------------------------------------------

def _count_nodes(tree, node_types):
    return sum(1 for node in ast.walk(tree) if isinstance(node, node_types))


def _detect_bug_hotspots(tree):
    """
    Lightweight heuristic bug detector. Used to seed the game's enemies
    and to power the offline fallback when no LLM key is configured.
    """
    hotspots = []

    for node in ast.walk(tree):
        # Bare except clauses
        if isinstance(node, ast.ExceptHandler) and node.type is None:
            hotspots.append((node.lineno, "Bare 'except:' silently swallows every error."))

        # Mutable default arguments
        if isinstance(node, ast.FunctionDef):
            for default in node.args.defaults:
                if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                    hotspots.append((node.lineno, "Mutable default argument leaks state across calls."))

        # == None / != None instead of is / is not
        if isinstance(node, ast.Compare):
            for op, comparator in zip(node.ops, node.comparators):
                is_none_const = isinstance(comparator, ast.Constant) and comparator.value is None
                if is_none_const and isinstance(op, (ast.Eq, ast.NotEq)):
                    hotspots.append((node.lineno, "Comparing to None with ==/!= instead of is/is not."))

        # Division that isn't guarded against a zero denominator. Skip the
        # common safe case of dividing by a nonzero numeric constant so we
        # don't flag things like "x / 2" as a bug.
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
            divisor = node.right
            is_safe_constant = (
                isinstance(divisor, ast.Constant)
                and isinstance(divisor.value, (int, float))
                and divisor.value != 0
            )
            if not is_safe_constant:
                hotspots.append((node.lineno, "Division here isn't guarded against a zero denominator."))

        # Unbounded 'while True' with no break anywhere inside
        if isinstance(node, ast.While) and isinstance(node.test, ast.Constant) and node.test.value is True:
            if not any(isinstance(n, ast.Break) for n in ast.walk(node)):
                hotspots.append((node.lineno, "Infinite 'while True' loop with no break condition."))

    # Dedupe by line, keep first reason per line
    seen = {}
    for line, reason in hotspots:
        seen.setdefault(line, reason)
    hotspots = list(seen.items())

    if not hotspots:
        for node in ast.walk(tree):
            if isinstance(node, (ast.For, ast.While, ast.FunctionDef)):
                hotspots.append((node.lineno, "Review this block for edge cases and complexity."))
                break

    return hotspots


@app.post("/api/analyze")
def analyze_code(payload: CodeInput):
    try:
        tree = ast.parse(payload.code)
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"SyntaxError: {e}")

    source_lines = payload.code.splitlines()
    loops = _count_nodes(tree, (ast.For, ast.While))
    functions = _count_nodes(tree, (ast.FunctionDef, ast.AsyncFunctionDef))
    branches = _count_nodes(tree, (ast.If,))
    total_lines = len([l for l in source_lines if l.strip()])

    hotspots = _detect_bug_hotspots(tree)
    bug_count = len(hotspots)

    # Complexity score: weighted structural heuristic that drives game difficulty
    complexity_score = round((loops * 2) + (branches * 1.5) + functions + (total_lines * 0.1), 1)

    return {
        "complexity_score": complexity_score,
        "bug_count": bug_count,
        "functions": functions,
        "loops": loops,
        "branches": branches,
        "lines": total_lines,
        "hotspots": [{"line": ln, "reason": reason} for ln, reason in hotspots],
    }


# ---------------------------------------------------------------------------
# /api/refactor  -  LLM-backed clean code + quiz generation, offline fallback
# ---------------------------------------------------------------------------

REFACTOR_SYSTEM_PROMPT = """You are CodeCrawl's refactoring engine. Given a snippet of buggy or messy \
code, respond with STRICT JSON ONLY — no markdown fences, no commentary — matching this schema:

{
  "clean_code": "<the fully refactored, corrected code as a single string, using \\n for newlines>",
  "quizzes": [
    {
      "bug_line": <int, 1-indexed line number in the ORIGINAL code>,
      "question": "<a short question about why that line/block was buggy>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answer": <int index 0-3 of the correct option>
    }
  ]
}

Generate one quiz question per real bug you find (at least 1, at most 6). Keep questions concise, \
options plausible, and exactly one option correct. Return valid JSON parseable by json.loads with \
no surrounding text."""


def _call_anthropic(code: str) -> Optional[dict]:
    if not ANTHROPIC_API_KEY:
        return None

    import requests

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": MODEL_NAME,
                "max_tokens": 2000,
                "system": REFACTOR_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": code}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        text = "".join(block.get("text", "") for block in data.get("content", []))
        text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
        return json.loads(text)
    except Exception:
        return None


def _fallback_refactor(code: str) -> dict:
    """Offline mode: no API key configured, or the LLM call failed/timed out.
    Produces a deterministic result so the app is always fully demoable."""
    repaired_code = re.sub(
        r"^(\s*)([A-Za-z_]\w*)\s*\+\+\s*(.+?)\s*$",
        r"\1\2 += \3",
        code,
        flags=re.MULTILINE,
    )

    try:
        tree = ast.parse(code)
        hotspots = _detect_bug_hotspots(tree)
    except SyntaxError:
        hotspots = [(1, "Fix the syntax error before continuing.")]

    if repaired_code != code:
        repaired_line = next(
            index
            for index, (before, after) in enumerate(
                zip(code.splitlines(), repaired_code.splitlines()), start=1
            )
            if before != after
        )
        hotspots.insert(
            0,
            (repaired_line, "Use += for addition assignment; ++ is not a Python increment operator."),
        )

    quizzes = []
    for line, reason in hotspots[:6]:
        quizzes.append(
            {
                "bug_line": line,
                "question": f"What's the issue on line {line}?",
                "options": [
                    reason,
                    "This line is completely fine as written.",
                    "It's only a style nitpick, not a functional bug.",
                    "It's a performance issue with no correctness impact.",
                ],
                "answer": 0,
            }
        )

    clean_code = (
        "# --- CodeCrawl offline mode: no ANTHROPIC_API_KEY configured ---\n"
        "# Add your key to backend/.env for real AI-generated refactors.\n\n" + repaired_code
    )

    return {"clean_code": clean_code, "quizzes": quizzes}


@app.post("/api/refactor", response_model=RefactorResponse)
def refactor_code(payload: CodeInput):
    try:
        ast.parse(payload.code)  # validate early so we can give a clear error
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"SyntaxError: {e}")

    raw = _call_anthropic(payload.code)
    if raw:
        try:
            # Validate the LLM's JSON actually matches our schema before trusting
            # it — malformed output (wrong types, missing fields) falls back to
            # the offline heuristic instead of surfacing a 500 to the user.
            return RefactorResponse(**raw)
        except Exception:
            pass

    return _fallback_refactor(payload.code)


@app.post("/api/debug", response_model=DebugResponse)
def debug_code(payload: CodeInput):
    """Run one local debugging session and return the captured console state."""
    try:
        compile(payload.code, "<CodeCrawl debugger>", "exec")
    except SyntaxError as error:
        return DebugResponse(
            status="syntax_error",
            stderr=f"SyntaxError: {error.msg} (line {error.lineno})",
            exit_code=1,
        )

    try:
        completed = subprocess.run(
            [sys.executable, "-I", "-c", payload.code],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except subprocess.TimeoutExpired as error:
        return DebugResponse(
            status="timeout",
            stdout=error.stdout or "",
            stderr="Execution stopped after 5 seconds.",
            exit_code=124,
        )

    return DebugResponse(
        status="passed" if completed.returncode == 0 else "runtime_error",
        stdout=completed.stdout,
        stderr=completed.stderr,
        exit_code=completed.returncode,
    )


@app.get("/")
def root():
    return {"status": "CodeCrawl API is running", "docs": "/docs"}
