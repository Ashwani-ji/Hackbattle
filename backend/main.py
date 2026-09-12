"""
CodeCrawl backend — FastAPI service.

Endpoints:
  POST /api/analyze   -> AST-based static analysis (complexity, bug hotspots)
    POST /api/refactor  -> Qwen2.5-Coder-backed clean code + quiz generation
                                                    (falls back to an offline heuristic mock if Ollama is
                                                    unavailable)
"""

import ast
import json
import os
import re
import subprocess
import sys
import asyncio
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b-instruct")

app = FastAPI(title="CodeCrawl API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # wildcard origin + credentials is rejected by browsers anyway;
                              # we don't use cookies/auth headers so this stays permissive and safe
    allow_methods=["*"],
    allow_headers=["*"],
)

party_rooms = {}


async def broadcast_party(room_code: str, message: dict):
    room = party_rooms.get(room_code)
    if not room:
        return
    stale = []
    for socket in room["members"]:
        try:
            await socket.send_json(message)
        except Exception:
            stale.append(socket)
    for socket in stale:
        room["members"].discard(socket)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CodeInput(BaseModel):
    code: str


class FixEvaluationInput(BaseModel):
    buggy_code: str
    fix_code: str


class FixEvaluationResponse(BaseModel):
    passed: bool
    feedback: str


class HintInput(BaseModel):
    code: str
    challenge: str = "debugging challenge"


class Quiz(BaseModel):
    bug_line: int
    question: str
    options: List[str]
    answer: int
    hint: str = ""


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


def _detect_text_hotspots(code: str):
    """Find common line-level mistakes even when the file does not parse."""
    hotspots = []
    for line_number, source in enumerate(code.splitlines(), start=1):
        line = source.strip()
        if not line or line.startswith("#"):
            continue
        if re.search(r"^(def\b|(?:if|elif|else|for|while|try|except|with)\b)", line) and not line.endswith(":"):
            hotspots.append((line_number, "Python block statements must end with a colon."))
        if re.search(r"\+\+|--", line):
            hotspots.append((line_number, "Python does not use ++ or -- for assignment."))
        if re.search(r"range\(\s*len\([^)]*\)\s*\+\s*1\s*\)", line):
            hotspots.append((line_number, "The extra range step can access one item past the end of the list."))
        if "open(" in line and "with open(" not in line:
            hotspots.append((line_number, "Open files with a context manager so they are closed reliably."))
        if re.search(r"\b(print|return)\s*\([^)]*(?:final_message|result_str)[^)]*\)", line):
            hotspots.append((line_number, "Verify that the variable used here is defined and matches the value built above."))

    seen = {}
    for line, reason in hotspots:
        seen.setdefault(line, reason)
    return list(seen.items())


def _build_relevant_quizzes(code: str, hotspots) -> List[dict]:
    lines = code.splitlines()
    quizzes = []
    for line, reason in hotspots[:12]:
        snippet = lines[line - 1].strip() if 0 < line <= len(lines) else ""
        if "++" in snippet:
            question = f"Line {line} uses `{snippet}`. Which Python operator should add the item to the running total?"
            options = [
                "Use += so the running total is updated",
                "Use ++ because Python treats it as increment",
                "Use == to assign the new total",
                "Remove the total and return the current item",
            ]
            hint = "Python has no increment operator; replace ++ with += for accumulation."
        elif "except" in snippet:
            question = f"How should you debug the exception handling on line {line}?"
            options = [
                "Catch the expected exception explicitly and inspect the error",
                "Use a bare except so every problem disappears",
                "Delete the try block without reproducing the failure",
                "Ignore the exception because the output may still look right",
            ]
            hint = "Start with the narrowest exception type that matches the failure."
        elif "/" in snippet:
            question = f"What runtime case should you test for the operation on line {line}?"
            options = [
                "A zero denominator that could raise ZeroDivisionError",
                "Only a larger numerator because division never fails",
                "A renamed variable without running the code",
                "An unrelated loop with no division in it",
            ]
            hint = "Trace the divisor with an input that makes it zero."
        elif snippet.startswith("while"):
            question = f"What should you verify before running the loop on line {line}?"
            options = [
                "That its state changes and a reachable exit condition exists",
                "That the loop has no break or stopping condition",
                "That every variable becomes global",
                "That the loop runs forever for difficult inputs",
            ]
            hint = "Follow one iteration and check what changes before the next test."
        elif snippet.startswith("def "):
            question = f"How can you verify the function defined on line {line}?"
            options = [
                "Trace a representative input through its assumptions and return value",
                "Rename the function before testing its behavior",
                "Remove the return statement to avoid failures",
                "Test only the function name without calling it",
            ]
            hint = "Use a small input with a known expected result."
        else:
            question = f"What is the best first debugging step for line {line}, `{snippet}`?"
            options = [
                "Reproduce the behavior and compare the actual value with the expected value",
                "Change several unrelated lines at the same time",
                "Skip reproduction and only reformat the code",
                "Assume the line is correct because it parses",
            ]
            hint = reason

        quizzes.append({
            "bug_line": line,
            "question": question,
            "options": options,
            "answer": 0,
            "hint": hint,
        })
    return quizzes


@app.post("/api/analyze")
def analyze_code(payload: CodeInput):
    syntax_error = None
    try:
        tree = ast.parse(payload.code)
    except SyntaxError as e:
        tree = None
        syntax_error = e

    source_lines = payload.code.splitlines()
    loops = _count_nodes(tree, (ast.For, ast.While)) if tree else 0
    functions = _count_nodes(tree, (ast.FunctionDef, ast.AsyncFunctionDef)) if tree else 0
    branches = _count_nodes(tree, (ast.If,)) if tree else 0
    total_lines = len([l for l in source_lines if l.strip()])

    hotspots = _detect_bug_hotspots(tree) if tree else []
    if syntax_error:
        hotspots.insert(0, (syntax_error.lineno or 1, f"Syntax error: {syntax_error.msg}."))
    hotspots.extend(_detect_text_hotspots(payload.code))
    hotspots = list({line: reason for line, reason in hotspots}.items())
    if not hotspots:
        hotspots = [(1, "Trace the input, transformation, and output before changing code.")]
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

Generate one quiz question per real bug you find (at least 1, at most 12). Keep questions concise, \
options plausible, and exactly one option correct. Preserve the original program's purpose, inputs, \
outputs, function names, and control flow while fixing every issue you identify. Return valid JSON \
parseable by json.loads with no surrounding text."""


def _is_valid_python_source(source: str) -> bool:
    try:
        ast.parse(source)
        return True
    except SyntaxError:
        return False


OLLAMA_EVALUATION_PROMPT = """You are CodeCrawl's code-fix judge. Compare the original buggy Python code with the user's proposed fix.
Return STRICT JSON ONLY, with exactly this shape:
{{"passed": true, "feedback": "brief arcade-style evaluation message"}}

Set passed to true only when the fix preserves the program's intended behavior and addresses the bug.
Set passed to false when it is incomplete, introduces a regression, or is not valid Python.
Keep feedback under 160 characters. Do not use markdown or surrounding commentary.

ORIGINAL BUGGY CODE:
{buggy_code}

USER FIX:
{fix_code}"""


def _call_ollama_evaluation(buggy_code: str, fix_code: str) -> Optional[dict]:
    import requests

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": OLLAMA_EVALUATION_PROMPT.format(
                    buggy_code=buggy_code,
                    fix_code=fix_code,
                ),
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1},
            },
            timeout=90,
        )
        response.raise_for_status()
        raw_text = response.json().get("response", "")
        raw_text = re.sub(r"^```(?:json)?|```$", "", raw_text.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(raw_text)
        if not isinstance(parsed.get("passed"), bool) or not isinstance(parsed.get("feedback"), str):
            return None
        return {"passed": parsed["passed"], "feedback": parsed["feedback"].strip()[:160]}
    except (requests.RequestException, json.JSONDecodeError, AttributeError, TypeError, KeyError):
        return None


def _call_ollama_refactor(code: str) -> Optional[dict]:
    import requests

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"{REFACTOR_SYSTEM_PROMPT}\n\nCODE TO REFACTOR:\n{code}",
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.15},
            },
            timeout=90,
        )
        response.raise_for_status()
        raw_text = response.json().get("response", "")
        raw_text = re.sub(r"^```(?:json)?|```$", "", raw_text.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(raw_text)
        return parsed if isinstance(parsed, dict) else None
    except (requests.RequestException, json.JSONDecodeError, AttributeError, TypeError):
        return None


def _call_ollama_hint(code: str, challenge: str) -> Optional[str]:
    import requests

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"Give one concise, targeted debugging hint for this {challenge}. Do not reveal the full fix. Return plain text under 140 characters.\n\nCODE:\n{code}",
                "stream": False,
                "options": {"temperature": 0.2},
            },
            timeout=90,
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()[:140] or None
    except (requests.RequestException, AttributeError, TypeError):
        return None


@app.post("/api/evaluate-fix", response_model=FixEvaluationResponse)
async def evaluate_fix(payload: FixEvaluationInput):
    result = await asyncio.to_thread(_call_ollama_evaluation, payload.buggy_code, payload.fix_code)
    if result is None:
        raise HTTPException(status_code=503, detail="Local Ollama evaluation is unavailable or returned invalid JSON.")
    return result


@app.post("/api/hint")
async def hint(payload: HintInput):
    result = await asyncio.to_thread(_call_ollama_hint, payload.code, payload.challenge)
    if not result:
        raise HTTPException(status_code=503, detail="Local Qwen hint generation is unavailable.")
    return {"hint": result}

def _fallback_refactor(code: str) -> dict:
    """Offline mode: no API key configured, or the LLM call failed/timed out.
    Produces a deterministic result so the app is always fully demoable."""
    repaired_code = re.sub(
        r"^(\s*)([A-Za-z_]\w*)\s*\+\+\s*(.+?)\s*$",
        r"\1\2 += \3",
        code,
        flags=re.MULTILINE,
    )
    repaired_code = re.sub(
        r"range\(\s*len\(([^)]+)\)\s*\+\s*1\s*\)",
        r"range(len(\1))",
        repaired_code,
    )
    if "result_str" in repaired_code and re.search(r"\bprint\(\s*final_message\s*\)", repaired_code):
        repaired_code = re.sub(r"\bprint\(\s*final_message\s*\)", "print(result_str)", repaired_code)
    repaired_code = re.sub(
        r"(\baverage\s*=\s*[^\n]*?/\s*count)\s*$",
        r"\1 if count else 0",
        repaired_code,
        flags=re.MULTILINE,
    )
    repaired_code = re.sub(
        r"^(\s*)(def\s+\w+\([^\n]*\)|(?:for|if|while|with|try|else|elif|except)\b[^:\n]*)(?<!:)\s*$",
        r"\1\2:",
        repaired_code,
        flags=re.MULTILINE,
    )

    try:
        tree = ast.parse(code)
        hotspots = _detect_bug_hotspots(tree)
    except SyntaxError:
        hotspots = []

    text_hotspots = _detect_text_hotspots(code)
    hotspots = list({line: reason for line, reason in hotspots + text_hotspots}.items())
    if not hotspots:
        hotspots = [(1, "Trace the input, transformation, and output before changing code.")]

    if repaired_code != code:
        hotspots = [
            hotspot for hotspot in hotspots
            if not hotspot[1].startswith("Review this block")
        ]
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

    hotspots = list({line: reason for line, reason in hotspots}.items())

    quizzes = _build_relevant_quizzes(code, hotspots)

    clean_code = repaired_code

    return {"clean_code": clean_code, "quizzes": quizzes}


@app.post("/api/refactor", response_model=RefactorResponse)
def refactor_code(payload: CodeInput):
    raw = _call_ollama_refactor(payload.code)
    if raw:
        try:
            # Validate the LLM's JSON actually matches our schema before trusting
            # it — malformed output (wrong types, missing fields) falls back to
            # the offline heuristic instead of surfacing a 500 to the user.
            response = RefactorResponse(**raw)
            if _is_valid_python_source(response.clean_code):
                return response
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


@app.websocket("/ws/party/{room_code}")
async def party_socket(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room_code = room_code.upper()[:8]
    room = party_rooms.setdefault(room_code, {"members": set(), "players": {}, "leader": None, "answered": set(), "code": ""})
    player_id = websocket.query_params.get("player", "player")[:32]
    requested_leader = websocket.query_params.get("leader") == "true"
    room["members"].add(websocket)
    if room["leader"] is None or requested_leader:
        room["leader"] = player_id
    room["players"][player_id] = {"name": player_id, "exp": 0, "coins": 0}
    await broadcast_party(room_code, {"type": "party_state", "leader": room["leader"], "players": room["players"], "code": room.get("code", "")})
    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "code" and player_id == room["leader"]:
                room["code"] = message.get("code", "")
                await broadcast_party(room_code, {"type": "party_state", "leader": room["leader"], "players": room["players"], "code": room["code"]})
            elif message_type == "answer":
                question_id = str(message.get("question", ""))
                first_solver = question_id not in room["answered"]
                room["answered"].add(question_id)
                for player in room["players"].values():
                    player["exp"] += 10
                    player["coins"] += 1
                room["players"][player_id]["exp"] += 20 if first_solver else 0
                room["players"][player_id]["coins"] += 2 if first_solver else 0
                await broadcast_party(room_code, {"type": "party_state", "leader": room["leader"], "players": room["players"], "code": room.get("code", ""), "firstSolver": player_id if first_solver else None})
    except WebSocketDisconnect:
        room["members"].discard(websocket)
        room["players"].pop(player_id, None)
        if room["leader"] == player_id:
            room["leader"] = next(iter(room["players"]), None)
        if room["members"]:
            await broadcast_party(room_code, {"type": "party_state", "leader": room["leader"], "players": room["players"], "code": room.get("code", "")})
        else:
            party_rooms.pop(room_code, None)
