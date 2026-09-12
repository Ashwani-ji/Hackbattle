'use client';

import { useEffect, useRef, useState } from 'react';
import CodeCrawlGame from '../components/CodeCrawlGame';
import CodeEditor from '../components/CodeEditor';
import MultiplayerLobby from '../components/MultiplayerLobby';
import MultiplayerSidebar from '../components/MultiplayerSidebar';
import MultiplayerPodium from '../components/MultiplayerPodium';
import MultiplayerSystems from '../components/MultiplayerSystems';
import useMultiplayerRoom from '../lib/useMultiplayerRoom';

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
  const [playMode, setPlayMode] = useState('solo');
  const multiplayer = useMultiplayerRoom();
  const multiplayerBaselineRef = useRef(starterCode);

  useEffect(() => {
    if (playMode === 'multiplayer') multiplayer.connect();
  }, [playMode]);

  useEffect(() => {
    if (playMode === 'multiplayer' && multiplayer.challenge?.code && !arcadeResult) {
      setCodeInput(multiplayer.challenge.code);
      multiplayerBaselineRef.current = multiplayer.challenge.code;
    }
  }, [playMode, multiplayer.challenge?.code, arcadeResult]);

  const importPythonFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith('.py'));
    if (!files.length) return;
    const contents = await Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(`# ${file.webkitRelativePath || file.name}\n${reader.result}`);
      reader.readAsText(file);
    })));
    setCodeInput(contents.join('\n\n'));
    multiplayerBaselineRef.current = contents.join('\n\n');
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
    if (playMode === 'multiplayer' && !arcadeResult) multiplayerBaselineRef.current = codeInput;
    multiplayer.submitCode(codeInput, multiplayerBaselineRef.current, Boolean(arcadeResult));
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
    if (playMode === 'multiplayer' && multiplayer.status !== 'in-room') {
      setMessage('Create or join a room before entering the multiplayer dungeon.');
      return;
    }
    if (playMode === 'multiplayer' && multiplayer.matchState === 'draft') {
      setMessage('The host must start the draft before the dungeon opens.');
      return;
    }
    await runArcade();
  };

  const handleQuitArcade = () => {
    setArcadeResult(null);
    setCodeInput('');
    setCoins(0);
    if (playMode === 'multiplayer') multiplayer.leaveRoom();
  };

  const playSfx = (enabled) => {
    if (!enabled || typeof window === 'undefined') return;
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 220;
    gain.gain.value = 0.025;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  };

  const handleCodeChange = (value) => {
    setCodeInput(value);
    if (playMode === 'multiplayer' && multiplayer.roomCode && !multiplayer.isSpectator) multiplayer.syncEditor(value, 0);
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
      {playMode === 'multiplayer' ? (
        <MultiplayerSystems
          room={multiplayer}
          onRanked={(username) => multiplayer.joinRanked(username, 1000)}
          onSpectate={multiplayer.spectateRoom}
          onModifier={multiplayer.useModifier}
          onHint={multiplayer.requestHint}
          onProfile={multiplayer.loadProfile}
          onSoundToggle={playSfx}
        />
      ) : null}

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
                <div className={playMode === 'multiplayer' ? 'multiplayer-session-layout' : ''}>
                  <CodeCrawlGame
                    metrics={{
                      complexity_score: arcadeResult.complexity_score,
                      bug_count: arcadeResult.bug_count,
                    }}
                    quizzes={arcadeResult.quizzes || []}
                    cleanCode={arcadeResult.clean_code || ''}
                    codeInput={codeInput}
                    onCodeChange={handleCodeChange}
                    onAnalyze={handleLaunch}
                    loading={loading}
                    onModeChange={setIsArcadeMode}
                    coins={coins}
                    setCoins={setCoins}
                    onQuit={handleQuitArcade}
                    onMultiplayerProgress={playMode === 'multiplayer' ? multiplayer.reportProgress : undefined}
                    submissionsLocked={playMode === 'multiplayer' && multiplayer.matchState === 'complete'}
                  />
                  {playMode === 'multiplayer' ? (
                    <MultiplayerSidebar
                      players={multiplayer.players.map((player) => ({ ...player, isYou: player.id === multiplayer.playerId }))}
                      roomCode={multiplayer.roomCode}
                      matchState={multiplayer.matchState}
                      remainingSeconds={multiplayer.remainingSeconds}
                      challenge={multiplayer.challenge}
                      onLeave={handleQuitArcade}
                    />
                  ) : null}
                  {playMode === 'multiplayer' && multiplayer.matchState === 'complete' ? (
                    <MultiplayerPodium
                      players={multiplayer.players}
                      winner={multiplayer.winner}
                      remainingSeconds={multiplayer.remainingSeconds}
                      onLeave={handleQuitArcade}
                    />
                  ) : null}
                </div>
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
                  onChange={(event) => handleCodeChange(event.target.value)}
                  placeholder="Paste buggy Python for the dungeon run"
                    ariaLabel="Paste buggy Python for the dungeon run"
                />
                  <div className="play-mode-switch" role="tablist" aria-label="Play mode">
                    <button className={playMode === 'solo' ? 'selected' : ''} onClick={() => setPlayMode('solo')} role="tab" aria-selected={playMode === 'solo'}>Solo Arcade</button>
                    <button className={playMode === 'multiplayer' ? 'selected' : ''} onClick={() => setPlayMode('multiplayer')} role="tab" aria-selected={playMode === 'multiplayer'}>Multiplayer Battle</button>
                  </div>
                  {playMode === 'multiplayer' ? (
                    <MultiplayerLobby room={multiplayer} onCreate={multiplayer.createRoom} onJoin={multiplayer.joinRoom} onStartMatch={multiplayer.startMatch} />
                  ) : null}
                <button onClick={handleLaunch} disabled={loading}>
                    {loading ? 'Analyzing...' : playMode === 'multiplayer' && multiplayer.status !== 'in-room' ? 'Create or join a room' : 'Start debugging lesson'}
                </button>
              </section>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
