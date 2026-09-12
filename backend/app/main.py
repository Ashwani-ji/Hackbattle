from __future__ import annotations

import ast
from typing import Any, Dict, List

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CodeCrawl API")

# Rooms live in memory because LAN party play is intended for a single local host.
party_rooms: Dict[str, Dict[str, Any]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodePayload(BaseModel):
    code: str


def party_snapshot(room: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "type": "party_state",
        "leader": room["leader"],
        "code": room["code"],
        "players": room["players"],
    }


async def broadcast_party_state(room: Dict[str, Any]) -> None:
    message = party_snapshot(room)
    disconnected = []
    for connection in list(room["connections"]):
        try:
            await connection.send_json(message)
        except RuntimeError:
            disconnected.append(connection)
    for connection in disconnected:
        room["connections"].pop(connection, None)


def analyze_python_code(code: str) -> Dict[str, Any]:
    lines = code.splitlines()
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        issue = {
            "kind": "syntax",
            "line": exc.lineno or 1,
            "title": "Syntax error",
            "detail": exc.msg,
        }
        return {
            "complexity_score": 3,
            "bug_count": 1,
            "functions": 0,
            "loops": 0,
            "lines": len(lines),
            "error": f"SyntaxError: {exc.msg} at line {exc.lineno}",
            "issues": [issue],
        }

    function_count = 0
    loop_count = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            function_count += 1
        if isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            loop_count += 1

    complexity_score = max(1, function_count * 2 + loop_count * 3 + len(lines) // 8)
    issues = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While, ast.AsyncFor)):
            issues.append({
                "kind": "loop",
                "line": node.lineno,
                "title": "Loop control check",
                "detail": "Verify the loop progresses and stops for every input.",
            })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            issues.append({
                "kind": "function",
                "line": node.lineno,
                "title": "Function contract check",
                "detail": f"Trace the inputs and return value of {node.name}.",
            })

    if not issues:
        issues.append({
            "kind": "general",
            "line": 1,
            "title": "Execution path check",
            "detail": "Trace the input, transformation, and output before changing code.",
        })

    bug_count = len(issues)

    return {
        "complexity_score": complexity_score,
        "bug_count": bug_count,
        "functions": function_count,
        "loops": loop_count,
        "lines": len(lines),
        "issues": issues,
    }


def build_quizzes(issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    quizzes = []
    for issue in issues:
        if issue["kind"] == "syntax":
            question = f"Line {issue['line']} has a syntax error. What should you do first?"
            options = [
                "Read the parser message and inspect nearby punctuation or indentation",
                "Rewrite the entire file without reading the error",
                "Add more loops to hide the failing line",
                "Run the program repeatedly and hope it parses",
            ]
        elif issue["kind"] == "loop":
            question = f"Line {issue['line']} starts a loop. Which debugging check matters most?"
            options = [
                "Confirm the loop changes state and has a reachable stopping condition",
                "Remove every value processed by the loop",
                "Convert the loop into a class immediately",
                "Ignore the loop and only rename variables",
            ]
        elif issue["kind"] == "function":
            question = f"Line {issue['line']} defines a function. How do you verify its contract?"
            options = [
                "Trace its inputs, assumptions, and return value with a small test case",
                "Call it with random values until the output looks right",
                "Delete its return statement so every call succeeds",
                "Move all code into global variables",
            ]
        else:
            question = "What is the best first move when this code has no obvious syntax marker?"
            options = [
                "Trace one representative input through each transformation and expected output",
                "Change several unrelated lines at once",
                "Skip reproduction and only format the file",
                "Replace working code before isolating a failure",
            ]

        quizzes.append({
            "bug_line": issue["line"],
            "topic": issue["title"],
            "question": question,
            "hint": issue["detail"],
            "options": options,
            "answer": 0,
        })
    return quizzes


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy"}


@app.websocket("/ws/party/{room_code}")
async def party_socket(
    websocket: WebSocket,
    room_code: str,
    player: str = Query("Player"),
    leader: bool = Query(False),
) -> None:
    """Synchronize a party's shared code and score board over the local network."""
    await websocket.accept()
    room_id = room_code.strip().upper()
    player_id = player.strip() or "Player"
    room = party_rooms.get(room_id)
    if room is None:
        room = {
            "leader": player_id,
            "code": "",
            "players": {},
            "connections": {},
        }
        party_rooms[room_id] = room

    room["players"].setdefault(player_id, {"name": player_id, "exp": 0, "coins": 0})
    room["connections"][websocket] = player_id
    await broadcast_party_state(room)

    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")
            if message_type == "code" and player_id == room["leader"]:
                room["code"] = str(message.get("code", ""))
            elif message_type == "answer":
                # The browser only submits this event after a correct answer.
                stats = room["players"][player_id]
                stats["exp"] += 10
                stats["coins"] += 1
            else:
                continue
            await broadcast_party_state(room)
    except WebSocketDisconnect:
        pass
    finally:
        room["connections"].pop(websocket, None)
        if player_id not in room["connections"].values():
            room["players"].pop(player_id, None)
        if not room["players"]:
            party_rooms.pop(room_id, None)
            return
        if room["leader"] == player_id and player_id not in room["players"]:
            room["leader"] = next(iter(room["players"]))
        await broadcast_party_state(room)


@app.post("/api/analyze")
def analyze(payload: CodePayload) -> Dict[str, Any]:
    return analyze_python_code(payload.code)


@app.post("/api/refactor")
def refactor(payload: CodePayload) -> Dict[str, Any]:
    metrics = analyze_python_code(payload.code)
    clean_code = """def cleaned_version():
    values = [1, 2, 3, 4, 5]
    total = 0
    for value in values:
        total += value
    return total
"""

    return {
        "clean_code": clean_code,
        "quizzes": build_quizzes(metrics["issues"]),
        **metrics,
    }
