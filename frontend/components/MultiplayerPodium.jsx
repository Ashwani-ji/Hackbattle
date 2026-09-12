'use client';

export default function MultiplayerPodium({ players, winner, remainingSeconds, onLeave }) {
  const orderedPlayers = [...players].sort((left, right) => (right.xp || 0) - (left.xp || 0));
  return (
    <div className="multiplayer-podium" role="dialog" aria-modal="true" aria-label="Match results">
      <p className="eyebrow">Battle results</p>
      <h2>{winner ? `${winner.name} wins the run` : remainingSeconds === 0 ? 'Time expired' : 'Dungeon cleared'}</h2>
      <p className="podium-subtitle">Final XP and ranking</p>
      <div className="podium-list">
        {orderedPlayers.map((player, index) => (
          <div className={index === 0 ? 'podium-row champion' : 'podium-row'} key={player.id}>
            <strong className="podium-place">{index + 1}</strong>
            <span>{player.name}<small>{player.solved || 0} solved</small></span>
            <b>{player.xp || 0} XP</b>
          </div>
        ))}
      </div>
      <button className="podium-close" onClick={onLeave}>Return to code</button>
    </div>
  );
}