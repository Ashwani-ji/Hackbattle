'use client';

import { useState } from 'react';
import CodeCrawlGame from '../components/CodeCrawlGame';
import CodeEditor from '../components/CodeEditor';

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
  const [debugResult, setDebugResult] = useState(null);
  const [arcadeResult, setArcadeResult] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const importPythonFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith('.py'));
    if (!files.length) return;
    const contents = await Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(`# ${file.webkitRelativePath || file.name}\n${reader.result}`);
      reader.readAsText(file);
    })));
    setCodeInput(contents.join('\n\n'));
    setArcadeResult(null);
    setPanicResult(null);
    event.target.value = '';
  };

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
    setDebugResult(null);
    await runRefactor();
  };

  const handleDebug = async () => {
    setLoading(true);
    setDebugResult(null);
    setMessage('');
    try {
      const response = await fetch('http://localhost:8000/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await response.json();
      setDebugResult(data);
    } catch (error) {
      setMessage('Debugger is unavailable. Start the API service first.');
    } finally {
      setLoading(false);
    }
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
        <div className="brand-sigil" aria-hidden="true">✣</div>
        <nav className="quick-nav" aria-label="Mode navigation">
          <button className={isArcadeMode ? 'quick-nav-button active' : 'quick-nav-button'} onClick={() => setIsArcadeMode(true)} title="Arcade mode">
            ⚔ <span>Arcade</span>
          </button>
          <button className={!isArcadeMode ? 'quick-nav-button active danger' : 'quick-nav-button danger'} onClick={() => setIsArcadeMode(false)} title="Panic mode">
            ⚠ <span>Panic</span>
          </button>
        </nav>
      </header>

      {message ? <div className="status-banner">{message}</div> : null}

      {!isArcadeMode ? (
        <section className="panel panic-panel">
          <div className="debug-toolbar">
            <span className="debug-label">Python debugger</span>
            <label className="import-button" title="Import Python files">
              <span aria-hidden="true">＋</span> Python files
              <input type="file" accept=".py" multiple onChange={importPythonFiles} />
            </label>
            <label className="import-button" title="Import a Python project folder">
              <span aria-hidden="true">▦</span> Project
              <input type="file" accept=".py" multiple webkitdirectory="" directory="" onChange={importPythonFiles} />
            </label>
            <button
              className="normal-mode-button"
              onClick={() => setIsArcadeMode(true)}
              aria-label="Return to Arcade mode"
              title="Return to Arcade mode"
            >
              ↩ <span>Arcade</span>
            </button>
            <button className="debug-run-button" onClick={handleDebug} disabled={loading}>
              {loading ? 'Running...' : 'Run file'}
            </button>
          </div>
          <CodeEditor
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Paste broken Python code here"
            ariaLabel="Paste broken Python code here"
          />
          <div className="panel-actions">
            <button onClick={handlePanicSubmit} disabled={loading}>
              {loading ? 'Fixing...' : 'Execute Emergency Fix'}
            </button>
          </div>

          {debugResult ? (
            <div className={`debug-console ${debugResult.status}`}>
              <div className="debug-console-heading">
                <strong>Console</strong>
                <span>{debugResult.status.replace('_', ' ')} · exit {debugResult.exit_code}</span>
              </div>
              <pre>{[debugResult.stdout, debugResult.stderr].filter(Boolean).join('\n')}</pre>
            </div>
          ) : null}

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
          <div className="reference-stage">
            {arcadeResult ? (
              <section className="game-workspace reference-game">
                <CodeCrawlGame
                  metrics={{
                    complexity_score: arcadeResult.complexity_score,
                    bug_count: arcadeResult.bug_count,
                  }}
                  quizzes={arcadeResult.quizzes || []}
                  cleanCode={arcadeResult.clean_code || ''}
                  codeInput={codeInput}
                  onCodeChange={setCodeInput}
                  onAnalyze={handleLaunch}
                  loading={loading}
                  onModeChange={setIsArcadeMode}
                  coins={coins}
                  setCoins={setCoins}
                  onQuit={handleQuitArcade}
                />
              </section>
            ) : (
              <section className="launch-stage">
                <p className="eyebrow">Arcade run</p>
                <h2>Enter the dungeon</h2>
                <p>Load your Python code to reveal the debugging arena.</p>
                <div className="import-actions">
                  <label className="import-button">
                    <span aria-hidden="true">＋</span> Add Python files
                    <input type="file" accept=".py" multiple onChange={importPythonFiles} />
                  </label>
                  <label className="import-button">
                    <span aria-hidden="true">▦</span> Add project folder
                    <input type="file" accept=".py" multiple webkitdirectory="" directory="" onChange={importPythonFiles} />
                  </label>
                </div>
                  <CodeEditor
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                  placeholder="Paste buggy Python for the dungeon run"
                    ariaLabel="Paste buggy Python for the dungeon run"
                />
                <button onClick={handleLaunch} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Start debugging lesson'}
                </button>
              </section>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
