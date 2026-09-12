const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map();
const matchmakingQueue = [];
const profiles = new Map();
const customDungeons = new Map();
const ROOM_TTL_MS = 30 * 60 * 1000;
const MATCH_DURATION_MS = 3 * 60 * 1000;
const EVALUATOR_URL = process.env.CODECRAWL_EVALUATOR_URL || 'http://localhost:8000/api/evaluate-fix';
const HINT_URL = process.env.CODECRAWL_HINT_URL || 'http://localhost:8000/api/hint';
const CHALLENGES = {
  easy: {
    id: 'easy',
    name: 'Syntax Sprint',
    description: 'Repair a small Python function and clear the parser trap.',
    code: 'def add_items(items):\n    total = 0\n    for item in items\n        total += item\n    return total\n',
  },
  medium: {
    id: 'medium',
    name: 'Logic Labyrinth',
    description: 'Trace a loop and restore the intended data flow.',
    code: 'def find_total(items):\n    total = 0\n    for item in items:\n        if item > 10:\n            total -= item\n    return total\n',
  },
  hard: {
    id: 'hard',
    name: 'Runtime Ruins',
    description: 'Hunt an edge case before it reaches production.',
    code: 'def average(values):\n    total = sum(values)\n    return total / len(values)\n',
  },
};

const normalizeChallenge = (challengeId) => CHALLENGES[challengeId] || CHALLENGES.medium;
const dailyChallenge = () => Object.values(CHALLENGES)[new Date().getUTCDate() % Object.keys(CHALLENGES).length];

const roomCode = () => {
  let code;
  do code = Math.random().toString(36).slice(2, 8).toUpperCase(); while (rooms.has(code));
  return code;
};

const broadcast = (code) => {
  const room = rooms.get(code);
  if (!room) return;
  const players = [...room.players.values()].sort((a, b) => b.xp - a.xp).map((player) => ({ ...player }));
  io.to(code).emit('room:state', {
    code,
    players,
    state: room.state,
    hostId: room.hostId,
    challenge: room.challenge,
    deadline: room.deadline,
    remainingSeconds: Math.max(0, Math.ceil((room.deadline - Date.now()) / 1000)),
    winner: room.winner || null,
    mode: room.mode,
    modifier: room.modifier,
    draft: room.draft,
    spectators: [...room.spectators.values()],
    activeEditors: [...room.editors.entries()].map(([id, editor]) => ({ id, ...editor })),
    dailyMap: dailyChallenge().id,
  });
};

const finishMatch = (room, code, winner = null) => {
  if (room.state === 'complete') return;
  room.state = 'complete';
  room.winner = winner;
  room.lastActivity = Date.now();
  broadcast(code);
};

io.on('connection', (socket) => {
  const ensureProfile = (username = 'Debugger') => {
    const profile = profiles.get(username) || { name: username, xp: 0, elo: 1000, achievements: [], inventory: ['scanline'], skillTree: ['syntax'], seasonPass: 1 };
    profiles.set(username, profile);
    socket.data.profileName = username;
    return profile;
  };
  socket.on('profile:get', ({ username } = {}) => socket.emit('profile:state', ensureProfile(username)));
  socket.on('profile:purchase', ({ username, item, cost = 0 } = {}) => {
    const profile = ensureProfile(username);
    if (profile.xp >= cost && !profile.inventory.includes(item)) {
      profile.xp -= cost;
      profile.inventory.push(item);
    }
    socket.emit('profile:state', profile);
  });
  socket.on('dungeon:publish', ({ username, title, code, difficulty = 'medium' } = {}) => {
    if (!username || !title || !code) return;
    const id = `${username}-${Date.now().toString(36)}`.toUpperCase();
    customDungeons.set(id, { id, title: title.slice(0, 48), code: code.slice(0, 12000), difficulty, author: username });
    socket.emit('dungeon:published', customDungeons.get(id));
  });
  socket.on('dungeon:list', () => socket.emit('dungeon:list', [...customDungeons.values()].slice(-20).reverse()));
  socket.on('ranked:join', ({ username, elo = 1000, mode = 'ranked' } = {}) => {
    ensureProfile(username);
    socket.data.queueEntry = { username: username || 'Debugger', elo: Number(elo) || 1000, mode };
    matchmakingQueue.push(socket);
    socket.emit('ranked:queued', { position: matchmakingQueue.length });
    const opponent = matchmakingQueue.find((candidate) => candidate !== socket && Math.abs(candidate.data.queueEntry.elo - socket.data.queueEntry.elo) <= 250);
    if (opponent) {
      const index = matchmakingQueue.indexOf(opponent);
      matchmakingQueue.splice(index, 1);
      matchmakingQueue.splice(matchmakingQueue.indexOf(socket), 1);
      createRoom({ username: socket.data.queueEntry.username, mode: 'ranked', opponentSocket: opponent });
    }
  });
  socket.on('ranked:leave', () => {
    const index = matchmakingQueue.indexOf(socket);
    if (index >= 0) matchmakingQueue.splice(index, 1);
  });
  const createRoom = ({ username, name, challengeId, mode = 'private', opponentSocket = null } = {}) => {
    const code = roomCode();
    const challenge = mode === 'daily' ? dailyChallenge() : normalizeChallenge(challengeId);
    rooms.set(code, {
      state: mode === 'draft' ? 'draft' : 'active',
      players: new Map(),
      lastActivity: Date.now(),
      buggyCode: challenge.code,
      challenge,
      hostId: socket.id,
      deadline: Date.now() + MATCH_DURATION_MS,
      winner: null,
      mode,
      modifier: 'none',
      spectators: new Map(),
      editors: new Map(),
      draft: { phase: 'complete', turn: null, bans: [], picks: [] },
    });
    socket.join(code);
    socket.data.roomCode = code;
    rooms.get(code).players.set(socket.id, { id: socket.id, name: username || name || 'Debugger', xp: 0, solved: 0, isHost: true, isYou: false });
    ensureProfile(username || name || 'Debugger');
    broadcast(code);
    if (opponentSocket) {
      opponentSocket.join(code);
      opponentSocket.data.roomCode = code;
      rooms.get(code).players.set(opponentSocket.id, { id: opponentSocket.id, name: opponentSocket.data.queueEntry.username, xp: 0, solved: 0, isHost: false, isYou: false });
      broadcast(code);
    }
  };
  const joinRoom = ({ roomCode: requestedCode, code, username, name } = {}) => {
    const requestedRoomCode = (requestedCode || code || '').trim().toUpperCase();
    const room = rooms.get(requestedRoomCode);
    if (!room) return socket.emit('room:error', 'Room not found. Check the code and try again.');
    if (room.state === 'complete') return socket.emit('room:error', 'This battle has already ended. Create a new room.');
    room.lastActivity = Date.now();
    socket.join(requestedRoomCode);
    socket.data.roomCode = requestedRoomCode;
    room.players.set(socket.id, { id: socket.id, name: username || name || 'Debugger', xp: 0, solved: 0, isHost: false, isYou: false });
    broadcast(requestedRoomCode);
  };
  socket.on('create-room', createRoom);
  socket.on('join-room', joinRoom);
  socket.on('room:create', createRoom);
  socket.on('room:join', joinRoom);
  const evaluateSubmission = async ({ code, buggyCode, submittedAt, evaluate = true } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player || !code || room.state === 'complete') return;
    room.lastActivity = Date.now();
    if (!evaluate) return;
    try {
      const response = await fetch(EVALUATOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buggy_code: room.buggyCode, fix_code: code }),
      });
      if (!response.ok) return;
      const result = await response.json();
      if (typeof result.passed !== 'boolean' || typeof result.feedback !== 'string') return;
      const elapsedSeconds = submittedAt && player.lastSubmittedAt
        ? Math.max(0, (Number(submittedAt) - player.lastSubmittedAt) / 1000)
        : 0;
      player.lastSubmittedAt = Number(submittedAt) || Date.now();
      player.lastEvaluation = result;
      if (result.passed) {
        player.xp += 100 + Math.max(0, Math.min(50, Math.round(30 - elapsedSeconds)));
        player.solved += 1;
        const profile = ensureProfile(player.name);
        profile.xp += player.xp;
        if (!profile.achievements.includes('first-blood')) profile.achievements.push('first-blood');
        profile.seasonPass = Math.min(100, profile.seasonPass + 1);
        if (room.mode === 'ranked') profile.elo += 25;
        const activePlayers = [...room.players.values()];
        const allCoopPlayersSolved = room.mode !== 'coop' || activePlayers.every((roomPlayer) => roomPlayer.solved > 0);
        if (allCoopPlayersSolved) finishMatch(room, socket.data.roomCode, { id: player.id, name: player.name, xp: player.xp });
        else broadcast(socket.data.roomCode);
      } else {
        broadcast(socket.data.roomCode);
      }
    } catch (error) {
      console.error('CodeCrawl Ollama evaluation failed:', error.message);
    }
  };

  socket.on('code:submit', (submission) => {
    if (socket.data.roomCode) {
      io.to(socket.data.roomCode).emit('code:submitted', { playerId: socket.id, code: submission?.code || '' });
      void evaluateSubmission(submission);
    }
  });
  socket.on('player:progress', ({ xp = 0, speed = 0, solved = 0 }) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!player || room.state === 'complete') return;
    room.lastActivity = Date.now();
    player.xp += Math.max(0, Number(xp) + Math.round(Math.max(0, Number(speed))));
    player.solved += Math.max(0, Number(solved));
    broadcast(socket.data.roomCode);
  });
  const leave = () => {
    const queueIndex = matchmakingQueue.indexOf(socket);
    if (queueIndex >= 0) matchmakingQueue.splice(queueIndex, 1);
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    room.spectators.delete(socket.id);
    room.players.delete(socket.id);
    socket.leave(code);
    if (room.players.size) {
      if (room.hostId === socket.id) {
        const nextHost = room.players.keys().next().value;
        room.hostId = nextHost;
        if (nextHost) room.players.get(nextHost).isHost = true;
      }
      broadcast(code);
    }
  };
  socket.on('room:leave', leave);
  socket.on('spectate-room', ({ roomCode: requestedCode, code } = {}) => {
    const requestedRoomCode = (requestedCode || code || '').trim().toUpperCase();
    const room = rooms.get(requestedRoomCode);
    if (!room) return socket.emit('room:error', 'Room not found. Check the code and try again.');
    socket.join(requestedRoomCode);
    socket.data.roomCode = requestedRoomCode;
    socket.data.spectator = true;
    room.spectators.set(socket.id, { id: socket.id, name: socket.data.profileName || 'Spectator' });
    broadcast(requestedRoomCode);
  });
  socket.on('editor:sync', ({ code = '', line = 0 } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state === 'complete') return;
    room.editors.set(socket.id, { code, line });
    socket.to(socket.data.roomCode).emit('editor:update', { id: socket.id, code, line });
  });
  socket.on('modifier:use', ({ modifier = 'static' } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.state === 'complete' || player.xp < 25) return;
    player.xp -= 25;
    room.modifier = modifier;
    broadcast(socket.data.roomCode);
    setTimeout(() => {
      if (room.modifier === modifier) {
        room.modifier = 'none';
        broadcast(socket.data.roomCode);
      }
    }, 15000);
  });
  socket.on('draft:ban', ({ challengeId } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id || !CHALLENGES[challengeId]) return;
    room.draft.bans = [...new Set([...room.draft.bans, challengeId])];
    room.challenge = normalizeChallenge(Object.keys(CHALLENGES).find((id) => !room.draft.bans.includes(id)));
    room.buggyCode = room.challenge.code;
    broadcast(socket.data.roomCode);
  });
  socket.on('match:start', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'draft') return;
    room.state = 'active';
    room.deadline = Date.now() + MATCH_DURATION_MS;
    broadcast(socket.data.roomCode);
  });
  socket.on('hint:request', ({ cost = 20 } = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    if (!room || !player || player.xp < cost) return;
    player.xp -= cost;
    fetch(HINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: room.buggyCode, challenge: room.challenge.name }),
    }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (result.hint) socket.emit('hint:result', { text: result.hint });
      broadcast(socket.data.roomCode);
    }).catch(() => broadcast(socket.data.roomCode));
  });
  socket.on('disconnect', leave);
});

httpServer.listen(process.env.PORT || 3001, () => console.log('CodeCrawl multiplayer server listening on 3001'));

setInterval(() => {
  const expiry = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms) {
    if (room.state === 'active' && room.deadline <= Date.now()) finishMatch(room, code);
    if (room.lastActivity < expiry) rooms.delete(code);
  }
}, 60 * 1000).unref();

setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.state === 'active' && room.deadline <= Date.now()) finishMatch(room, code);
    else if (room.state === 'active' && room.players.size) broadcast(code);
  }
}, 1000).unref();