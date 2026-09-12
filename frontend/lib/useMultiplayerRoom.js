'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socketUrl = process.env.NEXT_PUBLIC_MULTIPLAYER_URL || 'http://localhost:3001';

export default function useMultiplayerRoom() {
  const socketRef = useRef(null);
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [matchState, setMatchState] = useState('waiting');
  const [challenge, setChallenge] = useState(null);
  const [hostId, setHostId] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [winner, setWinner] = useState(null);
  const [mode, setMode] = useState('private');
  const [modifier, setModifier] = useState('none');
  const [spectators, setSpectators] = useState([]);
  const [activeEditors, setActiveEditors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [hint, setHint] = useState('');
  const [queueStatus, setQueueStatus] = useState('idle');
  const [publishedDungeon, setPublishedDungeon] = useState(null);
  const [isSpectator, setIsSpectator] = useState(false);

  useEffect(() => () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => {
    if (!deadline || matchState !== 'active') return undefined;
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline, matchState]);

  const connect = () => {
    if (socketRef.current) {
      if (!socketRef.current.connected && !socketRef.current.active) socketRef.current.connect();
      return socketRef.current;
    }
    const socket = io(socketUrl, { transports: ['websocket', 'polling'], autoConnect: true });
    socketRef.current = socket;
    setStatus('connecting');
    setError('');
    socket.on('connect', () => {
      setPlayerId(socket.id);
      setStatus('connected');
    });
    socket.on('connect_error', () => {
      setError('Multiplayer server is unavailable. Start the room server and try again.');
      setStatus('error');
    });
    socket.on('room:state', ({ code, players: nextPlayers, state, challenge: nextChallenge, hostId: nextHostId, deadline: nextDeadline, remainingSeconds: nextRemaining, winner: nextWinner, mode: nextMode, modifier: nextModifier, spectators: nextSpectators, activeEditors: nextEditors }) => {
      setRoomCode(code);
      setPlayers(nextPlayers || []);
      setMatchState(state || 'active');
      setChallenge(nextChallenge || null);
      setHostId(nextHostId || '');
      setDeadline(nextDeadline || 0);
      setRemainingSeconds(nextRemaining || 0);
      setWinner(nextWinner || null);
      setMode(nextMode || 'private');
      setModifier(nextModifier || 'none');
      setSpectators(nextSpectators || []);
      setActiveEditors(nextEditors || []);
      setStatus('in-room');
    });
    socket.on('editor:update', ({ id, code, line }) => {
      setActiveEditors((current) => [...current.filter((editor) => editor.id !== id), { id, code, line }]);
    });
    socket.on('room:error', (message) => {
      setError(message);
      setStatus('error');
    });
    socket.on('room:ended', () => setMatchState('complete'));
    socket.on('profile:state', setProfile);
    socket.on('hint:result', ({ text }) => setHint(text || ''));
    socket.on('ranked:queued', () => setQueueStatus('queued'));
    socket.on('dungeon:published', setPublishedDungeon);
    return socket;
  };

  const createRoom = (name, challengeId, mode) => {
    connect()?.emit('create-room', { username: name || 'Debugger', challengeId, mode });
  };

  const joinRoom = (code, name) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    connect()?.emit('join-room', { roomCode: normalizedCode, username: name || 'Debugger' });
  };

  const submitCode = (code, buggyCode = code, evaluate = true) => {
    if (roomCode && socketRef.current && !isSpectator) {
      socketRef.current.emit('code:submit', { code, buggyCode, submittedAt: Date.now(), evaluate });
    }
  };

  const reportProgress = ({ xp, speed, solved }) => {
    if (roomCode && socketRef.current) socketRef.current.emit('player:progress', { xp, speed, solved });
  };

  const joinRanked = (username, elo) => connect()?.emit('ranked:join', { username, elo });
  const leaveRanked = () => { socketRef.current?.emit('ranked:leave'); setQueueStatus('idle'); };
  const spectateRoom = (code) => { setIsSpectator(true); connect()?.emit('spectate-room', { roomCode: code }); };
  const syncEditor = (code, line) => socketRef.current?.emit('editor:sync', { code, line });
  const useModifier = (item) => socketRef.current?.emit('modifier:use', { modifier: item });
  const requestHint = () => socketRef.current?.emit('hint:request');
  const startMatch = () => socketRef.current?.emit('match:start');
  const loadProfile = (username) => connect()?.emit('profile:get', { username });
  const purchaseItem = (username, item, cost) => connect()?.emit('profile:purchase', { username, item, cost });
  const publishDungeon = (username, title, code, difficulty) => connect()?.emit('dungeon:publish', { username, title, code, difficulty });
  const listDungeons = () => connect()?.emit('dungeon:list');
  const selectDraftBan = (challengeId) => socketRef.current?.emit('draft:ban', { challengeId });

  const leaveRoom = () => {
    socketRef.current?.emit('room:leave');
    socketRef.current?.disconnect();
    socketRef.current = null;
    setRoomCode('');
    setPlayers([]);
    setStatus('idle');
    setMatchState('waiting');
    setChallenge(null);
    setHostId('');
    setDeadline(0);
    setRemainingSeconds(0);
    setWinner(null);
    setError('');
    setIsSpectator(false);
    setMode('private');
    setModifier('none');
    setSpectators([]);
    setActiveEditors([]);
    setHint('');
  };

  return { roomCode, playerId, players, status, error, matchState, challenge, hostId, deadline, remainingSeconds, winner, mode, modifier, spectators, activeEditors, profile, hint, queueStatus, publishedDungeon, isSpectator, connect, createRoom, joinRoom, submitCode, reportProgress, joinRanked, leaveRanked, spectateRoom, syncEditor, useModifier, requestHint, loadProfile, purchaseItem, publishDungeon, listDungeons, selectDraftBan, startMatch, leaveRoom };
}