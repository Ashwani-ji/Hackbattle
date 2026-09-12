"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import QuizModal from "../components/QuizModal";
import DiffViewer from "../components/DiffViewer";

const CodeCrawlGame = dynamic(() => import("../components/CodeCrawlGame"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const SAMPLE_CODE = `def process(data=[]):
    for i in range(len(data)):
        try:
            data[i] = data[i] / 0
        except:
            pass
    while True:
        if data == None:
            break
    return data`;

export default function Home() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [mode, setMode] = useState("panic"); // "panic" | "arcade"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [panicResult, setPanicResult] = useState(null);

  const [gameData, setGameData] = useState(null); // {bugCount, complexityScore, quizzes, cleanCode}
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [resumeFn, setResumeFn] = useState(null);
  const [victory, setVictory] = useState(false);

  const [backendStatus, setBackendStatus] = useState("checking"); // checking | online | offline

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/`)
      .then((r) => {
        if (!cancelled) setBackendStatus(r.ok ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setBackendStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function callApi(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `Request to ${path} failed`);
    }
    return res.json();
  }

  async function handlePanic() {
    setLoading(true);
    setError(null);
    setPanicResult(null);
    try {
      const refactor = await callApi("/api/refactor", { code });
      setPanicResult(refactor);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleArcade() {
    setLoading(true);
    setError(null);
    setGameData(null);
    setVictory(false);
    try {
      const [analysis, refactor] = await Promise.all([
        callApi("/api/analyze", { code }),
        callApi("/api/refactor", { code }),
      ]);
      setGameData({
        bugCount: analysis.bug_count,
        complexityScore: analysis.complexity_score,
        quizzes: refactor.quizzes,
        cleanCode: refactor.clean_code,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const onEnemyCollision = useCallback((quiz, resume) => {
    setActiveQuiz(quiz);
    setResumeFn(() => resume);
  }, []);

  const onVictory = useCallback(() => {
    setVictory(true);
  }, []);

  function onQuizAnswer(wasCorrect) {
    setActiveQuiz(null);
    if (resumeFn) resumeFn(wasCorrect);
    setResumeFn(null);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function downloadCode(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container">
      <header>
        <h1>🐛 CodeCrawl</h1>
        <p className="tagline">Panic Mode for emergencies. Arcade Mode for learning.</p>
        <span className={`status-badge status-${backendStatus}`}>
          {backendStatus === "online"
            ? "● Backend connected"
            : backendStatus === "offline"
            ? "○ Backend not reachable — start it (see README) then reload"
            : "… checking backend"}
        </span>
      </header>

      <div className="mode-toggle">
        <button className={mode === "panic" ? "active" : ""} onClick={() => setMode("panic")}>
          🚨 Panic Mode
        </button>
        <button className={mode === "arcade" ? "active" : ""} onClick={() => setMode("arcade")}>
          🎮 Arcade Mode
        </button>
      </div>

      <textarea
        className="code-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={12}
      />

      {mode === "panic" ? (
        <button className="primary big" onClick={handlePanic} disabled={loading || backendStatus === "offline"}>
          {loading ? "Fixing..." : "⚡ Execute Emergency Fix"}
        </button>
      ) : (
        <button className="primary big" onClick={handleArcade} disabled={loading || backendStatus === "offline"}>
          {loading ? "Loading Level..." : "🚀 Launch Bug Adventure"}
        </button>
      )}

      {error && <div className="error">⚠ {error}</div>}

      {mode === "panic" && panicResult && (
        <div className="diff-panel">
          <div className="diff-header">
            <h3>Diff: original → clean</h3>
            <div className="diff-actions">
              <button onClick={() => copyToClipboard(panicResult.clean_code)}>📋 Copy</button>
              <button onClick={() => downloadCode(panicResult.clean_code, "clean_code.py")}>
                ⬇ Download
              </button>
            </div>
          </div>
          <DiffViewer original={code} cleaned={panicResult.clean_code} />
        </div>
      )}

      {mode === "arcade" && gameData && !victory && (
        <div className="game-panel">
          <CodeCrawlGame
            bugCount={gameData.bugCount}
            complexityScore={gameData.complexityScore}
            quizzes={gameData.quizzes}
            onEnemyCollision={onEnemyCollision}
            onVictory={onVictory}
          />
        </div>
      )}

      {mode === "arcade" && victory && gameData && (
        <div className="victory-panel">
          <h2>🏆 Level Cleared!</h2>
          <p>All bugs squashed. Here&apos;s your refactored, clean code:</p>
          <div className="diff-header">
            <h3>Diff: original → clean</h3>
            <div className="diff-actions">
              <button onClick={() => copyToClipboard(gameData.cleanCode)}>📋 Copy</button>
              <button onClick={() => downloadCode(gameData.cleanCode, "clean_code.py")}>
                ⬇ Download
              </button>
            </div>
          </div>
          <DiffViewer original={code} cleaned={gameData.cleanCode} />
        </div>
      )}

      {activeQuiz && <QuizModal quiz={activeQuiz} onAnswer={onQuizAnswer} />}
    </main>
  );
}
