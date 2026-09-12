'use client';

export default function MultiplayerSidebar({ players, roomCode, matchState, remainingSeconds, challenge, onLeave }) {
  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  return (
    <aside className="multiplayer-sidebar" aria-label="Multiplayer leaderboard">
      <div className="sidebar-heading"><span>Battle room</span><strong>{roomCode}</strong></div>
      <div className="sidebar-status"><span className="connection-dot connected" /> {matchState === 'complete' ? 'Match complete' : 'Live ranking'}</div>
      <div className="match-timer" aria-label="Time remaining"><span>TIME</span><strong>{minutes}:{seconds}</strong></div>
      {challenge ? <div className="sidebar-challenge"><span>{challenge.id}</span><strong>{challenge.name}</strong></div> : null}
      <ol className="leaderboard">
        {players.map((player, index) => (
          <li key={player.id} className={player.isYou ? 'leader-row is-you' : 'leader-row'}>
            <span className="leader-rank">{index + 1}</span>
            <span className="leader-name">{player.name}{player.isYou ? ' (you)' : ''}<small>{player.solved || 0} solved</small></span>
            <strong className="leader-xp">{player.xp || 0}<small> XP</small></strong>
          </li>
        ))}
      </ol>
      <button className="leave-room" onClick={onLeave}>Leave battle</button>
    </aside>
  );
}