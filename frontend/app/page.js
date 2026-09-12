'use client';

import { useState } from 'react';
import CodeCrawlGame from '../components/CodeCrawlGame';

const starterCode = `def find_total(items):
    total = 0
    for item in items:
        if item > 10:
            total += item
    return total
`;

export default function HomePage() {
  const [isArcadeMode, setIsArcadeMode] = useState(true);
  const [codeInput, setCodeInput] = useState(starterCode);
  const [panicResult, setPanicResult] = useState(null);
  const [arcadeResult, setArcadeResult] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const runRefactor = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('http://localhost:8000/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await response.json();
      setPanicResult(data);
      return data;
    } catch (error) {
      setMessage('Backend is unavailable. Start the API service first.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runArcade = async () => {
    setLoading(true);
    setMessage('');
    try {
      const analyzeResponse = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const analyzeData = await analyzeResponse.json();

      const refactorResponse = await fetch('http://localhost:8000/api/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const refactorData = await refactorResponse.json();

      setArcadeResult({
        ...refactorData,
        complexity_score: analyzeData.complexity_score,
        bug_count: analyzeData.bug_count,
      });
    } catch (error) {
      setMessage('Launcher failed. Check the FastAPI backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handlePanicSubmit = async () => {
    await runRefactor();
  };

  const handleLaunch = async () => {
    await runArcade();
  };

  const handleQuitArcade = () => {
    setArcadeResult(null);
    setCodeInput('');
    setCoins(0);
  };

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Bug-fixing arcade</p>
          <h1>CodeCrawl</h1>
        </div>
        <div className="mode-toggle" aria-label="Mode switcher">
          <button
            className={isArcadeMode ? 'mode-button active' : 'mode-button'}
            onClick={() => setIsArcadeMode(true)}
          >
            Arcade mode
          </button>
          <button
            className={!isArcadeMode ? 'mode-button active' : 'mode-button'}
            onClick={() => setIsArcadeMode(false)}
          >
            Panic mode
          </button>
        </div>
      </header>

      {message ? <div className="status-banner">{message}</div> : null}

      {!isArcadeMode ? (
        <section className="panel panic-panel">
          <textarea
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            rows={16}
            placeholder="Paste broken Python code here"
          />
          <div className="panel-actions">
            <button onClick={handlePanicSubmit} disabled={loading}>
              {loading ? 'Fixing...' : 'Execute Emergency Fix'}
            </button>
          </div>

          {panicResult ? (
            <div className="result-card">
              <div className="result-meta">
                <span>Complexity: {panicResult.complexity_score}</span>
                <span>Bugs: {panicResult.bug_count}</span>
              </div>
              <pre>{panicResult.clean_code}</pre>
              <div className="code-actions">
                <button
                  onClick={() => navigator.clipboard.writeText(panicResult.clean_code || '')}
                >
                  Copy Code
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="panel arcade-panel">
          <div className="debug-layout">
            <section className="code-workspace">
              <div className="workspace-heading">
                <div>
                  <p className="eyebrow">Debug workspace</p>
                  <h2>Code under investigation</h2>
                </div>
                <span className="workspace-tag">Python</span>
              </div>
              <textarea
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                rows={16}
                placeholder="Paste buggy Python for the dungeon run"
              />
              <div className="panel-actions">
                <button onClick={handleLaunch} disabled={loading}>
                  {loading ? 'Analyzing...' : arcadeResult ? 'Re-analyze code' : 'Start debugging lesson'}
                </button>
              </div>
            </section>

            <section className="game-workspace">
              {arcadeResult ? (
            <CodeCrawlGame
              metrics={{
                complexity_score: arcadeResult.complexity_score,
                bug_count: arcadeResult.bug_count,
              }}
              quizzes={arcadeResult.quizzes || []}
              cleanCode={arcadeResult.clean_code || ''}
              coins={coins}
              setCoins={setCoins}
              onQuit={handleQuitArcade}
            />
              ) : (
                <div className="game-placeholder">
                  <p className="eyebrow">Learning dungeon</p>
                  <h2>Submit code to reveal its debugging lessons.</h2>
                  <p>Each quiz will point to a real structure found in this file.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
