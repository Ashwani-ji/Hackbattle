'use client';

const rows = [
  ['MISSION', 'CodeCrawl', 'ACTIVE', '99%'],
  ['ROOM', 'Dungeon-07', 'ONLINE', 'SYNC'],
  ['BUGS', '12 open', 'SCAN', 'LIVE'],
  ['FIX RATE', '3.4/min', 'STABLE', '82%'],
  ['BOSS', 'Refactor Rift', 'PENDING', 'HIGH'],
];

export default function PanicMissionBoard() {
  return (
    <div className="panic-mission-board" aria-label="CodeCrawl mission board">
      <div className="mission-toolbar">
        <span>CODECRAWL//BRIEF</span>
        <b>RIFT STATUS</b>
        <small>LIVE</small>
      </div>
      <div className="mission-grid">
        <div className="mission-row mission-head">
          <span>NODE</span>
          <span>VALUE</span>
          <span>STATE</span>
          <span>CONF.</span>
        </div>
        {rows.map((row) => (
          <div className="mission-row" key={row[0]}>
            {row.map((cell) => <span key={`${row[0]}-${cell}`}>{cell}</span>)}
          </div>
        ))}
      </div>
      <div className="mission-alert">SYSTEM NOTE: patch the broken logic, stabilize the dungeon, and keep the room alive.</div>
    </div>
  );
}