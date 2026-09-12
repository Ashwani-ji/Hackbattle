'use client';

import { useEffect, useRef, useState } from 'react';
import CodeCrawlGame from '../components/CodeCrawlGame';
import CodeEditor from '../components/CodeEditor';
<<<<<<< HEAD
=======
import MultiplayerLobby from '../components/MultiplayerLobby';
import MultiplayerSidebar from '../components/MultiplayerSidebar';
import MultiplayerPodium from '../components/MultiplayerPodium';
import MultiplayerSystems from '../components/MultiplayerSystems';
import PanicMissionBoard from '../components/PanicSpreadsheet';
import useMultiplayerRoom from '../lib/useMultiplayerRoom';
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)

const starterCode = `def find_total(items):
    total = 0
    for item in items:
        if item > 10:
            total += item
    return total
`;

const getApiBaseUrl = () => {
  const host = window.location.hostname || 'localhost';
  return `http://${host}:8000`;
};

const getPartySocketUrl = (roomCode, player, leader) => {
  const host = window.location.hostname || 'localhost';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${host}:8000/ws/party/${roomCode}?player=${encodeURIComponent(player || 'Player')}&leader=${leader}`;
};

export default function HomePage() {
  const [isArcadeMode, setIsArcadeMode] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [codeInput, setCodeInput] = useState(starterCode);
  const [panicResult, setPanicResult] = useState(null);
  const [debugResult, setDebugResult] = useState(null);
  const [arcadeResult, setArcadeResult] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
<<<<<<< HEAD
  const [playerName, setPlayerName] = useState('Player');
  const [playerStats, setPlayerStats] = useState({ exp: 0, coins: 0 });
  const [roomInput, setRoomInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [partyState, setPartyState] = useState(null);
  const partySocket = useRef(null);
  const isPartyLeader = partyState?.leader === playerName;
  const currentPlayerStats = partyState?.players?.[playerName]
    ? { exp: partyState.players[playerName].exp, coins: partyState.players[playerName].coins }
    : { exp: playerStats.exp, coins };
  const leaderboardEntries = partyState
    ? Object.entries(partyState.players || {}).sort(([, left], [, right]) => right.exp - left.exp)
    : [[playerName, { name: playerName || 'Player', exp: currentPlayerStats.exp, coins: currentPlayerStats.coins }]];
=======
  const [playMode, setPlayMode] = useState('solo');
  const [missionMode, setMissionMode] = useState(false);
  const multiplayer = useMultiplayerRoom();
  const multiplayerBaselineRef = useRef(starterCode);
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)

  useEffect(() => () => partySocket.current?.close(), []);

  const handleNavMode = (mode) => {
    if (mode === 'leaderboard') {
      setShowLeaderboard(true);
      setIsArcadeMode(true);
      return;
    }

    setShowLeaderboard(false);
    setIsArcadeMode(mode === 'arcade');
  };

  const connectParty = (code, leader = false) => {
    partySocket.current?.close();
    const socket = new WebSocket(getPartySocketUrl(code, playerName, leader));
    socket.onopen = () => {
      setRoomCode(code);
      setMessage(`Party ${code} connected.`);
      socket.send(JSON.stringify({ type: 'code', code: codeInput }));
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'party_state') {
        setPartyState(data);
        const currentPlayer = data.players?.[playerName];
        if (currentPlayer) {
          setPlayerStats({ exp: currentPlayer.exp || 0, coins: currentPlayer.coins || 0 });
        }
        if (data.code && data.leader !== playerName) {
          setCodeInput(data.code);
        }
      }
      if (data.type === 'code' && data.leader !== playerName) {
        setCodeInput(data.code);
      }
    };
    socket.onerror = () => setMessage('Party connection failed. Use the computer IP on the same Wi-Fi.');
    socket.onclose = () => setPartyState(null);
    partySocket.current = socket;
  };

  const createParty = () => connectParty(Math.random().toString(36).slice(2, 8).toUpperCase(), true);
  const joinParty = () => roomInput.trim() && connectParty(roomInput.trim().toUpperCase());
  const leaveParty = () => {
    partySocket.current?.close();
    partySocket.current = null;
    setRoomCode('');
    setPartyState(null);
    setRoomInput('');
    setMessage('');
  };
  const updateSharedCode = (code) => {
    setCodeInput(code);
    if (isPartyLeader && partySocket.current?.readyState === WebSocket.OPEN) {
      partySocket.current.send(JSON.stringify({ type: 'code', code }));
    }
  };
  const sendPartyAnswer = (question) => {
    if (partySocket.current?.readyState === WebSocket.OPEN) partySocket.current.send(JSON.stringify({ type: 'answer', question }));
  };

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
      const response = await fetch(`${getApiBaseUrl()}/api/refactor`, {
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
<<<<<<< HEAD
=======
    if (playMode === 'multiplayer' && !arcadeResult) multiplayerBaselineRef.current = codeInput;
    multiplayer.submitCode(codeInput, multiplayerBaselineRef.current, Boolean(arcadeResult));
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)
    try {
      const analyzeResponse = await fetch(`${getApiBaseUrl()}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const analyzeData = await analyzeResponse.json();

      const refactorResponse = await fetch(`${getApiBaseUrl()}/api/refactor`, {
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
      const response = await fetch(`${getApiBaseUrl()}/api/debug`, {
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
<<<<<<< HEAD
=======
    if (playMode === 'multiplayer' && multiplayer.status !== 'in-room') {
      setMessage('Create or join a room before entering the multiplayer dungeon.');
      return;
    }
    if (playMode === 'multiplayer' && multiplayer.matchState === 'draft') {
      setMessage('The host must start the draft before the dungeon opens.');
      return;
    }
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)
    await runArcade();
  };

  const handleQuitArcade = () => {
    setArcadeResult(null);
    setCodeInput('');
    setCoins(0);
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
          <button className={isArcadeMode && !showLeaderboard ? 'quick-nav-button active' : 'quick-nav-button'} onClick={() => handleNavMode('arcade')} title="Arcade mode">
            ⚔ <span>Arcade</span>
          </button>
          <button className={showLeaderboard ? 'quick-nav-button active leaderboard' : 'quick-nav-button leaderboard'} onClick={() => handleNavMode('leaderboard')} title="Leaderboard view">
            🏆 <span>Leaderboard</span>
          </button>
          <button className={!isArcadeMode && !showLeaderboard ? 'quick-nav-button active danger' : 'quick-nav-button danger'} onClick={() => handleNavMode('panic')} title="Panic mode">
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

      {showLeaderboard ? (
        <section className="panel leaderboard-view-panel">
          <div className="leaderboard-header">
            <div>
              <span className="eyebrow">Leaderboard</span>
              <strong>{partyState ? `${Object.keys(partyState.players || {}).length} connected` : 'Local progress'}</strong>
            </div>
            <span className="leaderboard-tag">{partyState ? (partyState.leader === playerName ? 'Leader' : 'Follower') : 'Solo'}</span>
          </div>

          <div className="leaderboard-list">
            {leaderboardEntries.map(([id, player], index) => (
              <div key={id} className={`leaderboard-item ${partyState?.leader === id ? 'leader' : ''}`}>
                <span className="leaderboard-rank">#{index + 1}</span>
                <div className="leaderboard-player">
                  <strong>{player.name}</strong>
                  <small>{player.exp} XP · {player.coins} coins</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : !isArcadeMode ? (
        <section className="panel panic-panel">
          <div className="debug-toolbar">
            <span className="debug-label">Python debugger</span>
            <button className="normal-mode-button" onClick={() => setMissionMode((visible) => !visible)}>{missionMode ? 'Debugger' : 'Mission'}</button>
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
          {missionMode ? <PanicMissionBoard /> : null}
          {!missionMode ? <CodeEditor
            value={codeInput}
            onChange={(event) => updateSharedCode(event.target.value)}
            placeholder="Paste broken Python code here"
            ariaLabel="Paste broken Python code here"
          /> : null}
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
          <section className="party-bar">
            <div className="party-heading">
              <div>
                <span className="eyebrow">LAN party</span>
                <strong>{roomCode ? `Room ${roomCode}` : 'Play together over Wi-Fi'}</strong>
              </div>
              {roomCode ? <span className="party-role">{isPartyLeader ? 'Leader · shared code source' : 'Following leader'}</span> : null}
            </div>

            <div className="party-controls">
              <label className="party-field">
                <span>Player</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Your name" aria-label="Your player name" />
              </label>

              {!roomCode ? (
                <>
                  <label className="party-field party-field-compact">
                    <span>Room code</span>
                    <input value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="Enter code" aria-label="Room code" />
                  </label>
                  <button className="party-button primary" onClick={createParty}>Create party</button>
                  <button className="party-button secondary" onClick={joinParty}>Join</button>
                </>
              ) : (
                <button className="party-button tertiary" onClick={leaveParty}>Leave room</button>
              )}
            </div>
          </section>

          {!partyState ? (
            <section className="player-summary-panel">
              <div className="player-summary-header">
                <span className="eyebrow">Profile</span>
                <strong>{playerName || 'Player'}</strong>
              </div>
              <div className="player-summary-stats">
                <div className="summary-stat">
                  <span>EXP</span>
                  <strong>{currentPlayerStats.exp}</strong>
                </div>
                <div className="summary-stat">
                  <span>Coins</span>
                  <strong>{currentPlayerStats.coins}</strong>
                </div>
              </div>
            </section>
          ) : null}

          <div className="reference-stage">
            {arcadeResult ? (
              <section className="game-workspace reference-game">
<<<<<<< HEAD
                <CodeCrawlGame
                  metrics={{
                    complexity_score: arcadeResult.complexity_score,
                    bug_count: arcadeResult.bug_count,
                  }}
                  quizzes={arcadeResult.quizzes || []}
                  cleanCode={arcadeResult.clean_code || ''}
                  codeInput={codeInput}
                  onCodeChange={updateSharedCode}
                  onAnalyze={handleLaunch}
                  loading={loading}
                  onModeChange={setIsArcadeMode}
                  onPartyAnswer={sendPartyAnswer}
                  coins={coins}
                  setCoins={setCoins}
                  onQuit={handleQuitArcade}
                />
=======
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
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)
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
<<<<<<< HEAD
=======
                  <div className="play-mode-switch" role="tablist" aria-label="Play mode">
                    <button className={playMode === 'solo' ? 'selected' : ''} onClick={() => setPlayMode('solo')} role="tab" aria-selected={playMode === 'solo'}>Solo Arcade</button>
                    <button className={playMode === 'multiplayer' ? 'selected' : ''} onClick={() => setPlayMode('multiplayer')} role="tab" aria-selected={playMode === 'multiplayer'}>Multiplayer Battle</button>
                  </div>
                  {playMode === 'multiplayer' ? (
                    <MultiplayerLobby room={multiplayer} onCreate={multiplayer.createRoom} onJoin={multiplayer.joinRoom} onStartMatch={multiplayer.startMatch} />
                  ) : null}
>>>>>>> 0554f81 (Update CodeCrawl frontend and multiplayer app)
                <button onClick={handleLaunch} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Start debugging lesson'}
                </button>
              </section>
            )}
          </div>
          {partyState ? (
            <section className="leaderboard-panel">
              <div className="leaderboard-header">
                <div>
                  <span className="eyebrow">Party leaderboard</span>
                  <strong>{Object.keys(partyState.players || {}).length} connected</strong>
                </div>
                <span className="leaderboard-tag">{partyState.leader === playerName ? 'Leader' : 'Follower'}</span>
              </div>
              <div className="leaderboard-list">
                {Object.entries(partyState.players || {}).sort(([, left], [, right]) => right.exp - left.exp).map(([id, player], index) => (
                  <div key={id} className={`leaderboard-item ${partyState.leader === id ? 'leader' : ''}`}>
                    <span className="leaderboard-rank">#{index + 1}</span>
                    <div className="leaderboard-player">
                      <strong>{player.name}</strong>
                      <small>{player.exp} XP · {player.coins} coins</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}
