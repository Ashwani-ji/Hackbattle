'use client';

import { useEffect, useState } from 'react';

const news = [
  'QWEN WATCH: local evaluation is online',
  'DAILY DUNGEON: route integrity compromised',
  'MATCH OPS: speed rewards are amplified this cycle',
];

export default function MultiplayerSystems({ room, onRanked, onSpectate, onModifier, onHint, onProfile, onSoundToggle }) {
  const [username, setUsername] = useState('Runner');
  const [spectateCode, setSpectateCode] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [dungeonTitle, setDungeonTitle] = useState('My Glitched Dungeon');
  const [dungeonCode, setDungeonCode] = useState('def solve(values):\n    return values\n');
  const [newsIndex, setNewsIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNewsIndex((index) => (index + 1) % news.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    onSoundToggle(next);
  };

  return (
    <>
      <div className="global-news-ticker"><span>NEWS // </span>{news[newsIndex]}</div>
      <div className="systems-rail">
        <div className="system-row">
          <input className="room-input" value={username} onChange={(event) => setUsername(event.target.value)} aria-label="Player profile name" />
          <button onClick={() => onProfile(username)}>Profile</button>
          <button onClick={toggleSound}>{soundOn ? 'SFX on' : 'SFX off'}</button>
        </div>
        <div className="system-row">
          <button onClick={() => onRanked(username)}>Ranked queue{room.queueStatus === 'queued' ? ' · searching' : ''}</button>
          <input className="room-input" value={spectateCode} onChange={(event) => setSpectateCode(event.target.value.toUpperCase())} maxLength={6} placeholder="WATCH CODE" aria-label="Spectate room code" />
          <button onClick={() => onSpectate(spectateCode)} disabled={!spectateCode}>Spectate</button>
        </div>
        {room.matchState === 'active' && room.roomCode ? (
          <div className="system-row compact-controls">
            <span>Glitch items</span>
            <button onClick={() => onModifier('static')}>Static -25 XP</button>
            <button onClick={onHint}>Qwen hint -20 XP</button>
          </div>
        ) : null}
        {room.profile ? <div className="profile-strip">{room.profile.name} · {room.profile.xp} XP · {room.profile.inventory.join(' / ')}</div> : null}
        {room.isSpectator ? (
          <div className="spectator-feed">
            <span>SPECTATOR FEED · {room.spectators.length} watching</span>
            {room.activeEditors.map((editor) => <pre key={editor.id}>{editor.code}</pre>)}
          </div>
        ) : null}
        <div className="system-row">
          <button onClick={() => setShowCreator((visible) => !visible)}>Custom dungeon</button>
          {room.profile ? <button onClick={() => room.purchaseItem(username, 'cursor-trail', 100)}>Buy cursor trail · 100 XP</button> : null}
        </div>
        {showCreator ? (
          <div className="creator-panel">
            <input className="room-input" value={dungeonTitle} onChange={(event) => setDungeonTitle(event.target.value)} aria-label="Dungeon title" />
            <textarea value={dungeonCode} onChange={(event) => setDungeonCode(event.target.value)} aria-label="Custom dungeon code" />
            <button onClick={() => room.publishDungeon(username, dungeonTitle, dungeonCode, 'medium')}>Publish challenge</button>
            {room.publishedDungeon ? <span>Published: {room.publishedDungeon.id}</span> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}