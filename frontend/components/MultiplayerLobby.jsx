'use client';

import { useState } from 'react';

export default function MultiplayerLobby({ room, onCreate, onJoin, onStartMatch }) {
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [challengeId, setChallengeId] = useState('medium');
  const [mode, setMode] = useState('private');
  const inRoom = room.status === 'in-room';

  return (
    <div className="multiplayer-lobby">
      <div className="multiplayer-heading">
        <div>
          <span className="mode-kicker">Live session</span>
          <h3>Multiplayer battle</h3>
        </div>
        <span className={`connection-dot ${room.status}`} aria-label={room.status} />
      </div>
      {!inRoom ? (
        <>
          <input className="room-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your callsign (optional)" aria-label="Your callsign" />
          <div className="room-actions">
            <button className="room-primary" onClick={() => onCreate(name, challengeId, mode)} disabled={room.status === 'connecting'}>Create room</button>
            <div className="join-control">
              <input className="room-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ROOM CODE" aria-label="Room code" />
              <button onClick={() => onJoin(joinCode, name)} disabled={!joinCode || room.status === 'connecting'}>Join</button>
            </div>
          </div>
          <label className="challenge-control">
            <span>Challenge</span>
            <select value={challengeId} onChange={(event) => setChallengeId(event.target.value)} aria-label="Challenge difficulty">
              <option value="easy">Easy · Syntax Sprint</option>
              <option value="medium">Medium · Logic Labyrinth</option>
              <option value="hard">Hard · Runtime Ruins</option>
            </select>
          </label>
          <label className="challenge-control">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Battle mode">
              <option value="private">Private Battle</option>
              <option value="tdd">TDD Battle</option>
              <option value="coop">Co-op Boss Fight</option>
              <option value="daily">Daily Speedrun</option>
              <option value="draft">Draft Arena</option>
            </select>
          </label>
          {room.error ? <p className="room-error">{room.error}</p> : <p className="room-hint">Create a room to invite your debugging party.</p>}
        </>
      ) : (
        <div className="room-ready">
          <span>Room code</span>
          <strong>{room.roomCode}</strong>
          <small>{room.players.length} player{room.players.length === 1 ? '' : 's'} connected</small>
          <small>{room.challenge?.name || 'Challenge loaded'}</small>
          {room.matchState === 'draft' && room.hostId === room.playerId ? <button className="room-primary" onClick={onStartMatch}>Start drafted match</button> : null}
        </div>
      )}
    </div>
  );
}