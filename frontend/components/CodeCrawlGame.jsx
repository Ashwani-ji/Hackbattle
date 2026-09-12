'use client';

import { useEffect, useMemo, useState } from 'react';
import DungeonCanvas from './DungeonCanvas';

const createMobHealth = (count) =>
  Array.from({ length: count }, () => Math.floor(Math.random() * 3) + 1);

export default function CodeCrawlGame({ metrics, quizzes, cleanCode, coins, setCoins, onQuit }) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [killedEnemies, setKilledEnemies] = useState([]);
  const [isKilling, setIsKilling] = useState(false);
  const [enemyCount, setEnemyCount] = useState(() => 5 + Math.floor(Math.random() * 2));
  const [enemyHealth, setEnemyHealth] = useState([]);
  const [dyingEnemies, setDyingEnemies] = useState([]);
  const [killCombo, setKillCombo] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [attackNonce, setAttackNonce] = useState(0);
  const [attackStartedAt, setAttackStartedAt] = useState(0);

  const enemies = useMemo(
    () => Array.from({ length: enemyCount }, (_, index) => ({
      id: index,
      name: index === 0 ? 'Syntax Crawler' : `Crawler ${index + 1}`,
      shape: ['beetle', 'spider', 'mantis', 'roach'][index % 4],
    })),
    [enemyCount]
  );

  useEffect(() => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsComplete(false);
    setKilledEnemies([]);
    setIsKilling(false);
    const mobCount = 5 + Math.floor(Math.random() * 2);
    setEnemyCount(mobCount);
    setEnemyHealth(createMobHealth(mobCount));
    setDyingEnemies([]);
    setKillCombo(0);
    setCombo(0);
    setFeedback('');
    setIsPaused(false);
    setAttackNonce(0);
    setAttackStartedAt(0);
  }, [metrics?.bug_count, metrics?.complexity_score, quizzes]);

  const restartRun = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsComplete(false);
    setKilledEnemies([]);
    setIsKilling(false);
    const mobCount = 5 + Math.floor(Math.random() * 2);
    setEnemyCount(mobCount);
    setEnemyHealth(createMobHealth(mobCount));
    setDyingEnemies([]);
    setKillCombo(0);
    setCombo(0);
    setFeedback('');
    setCoins(0);
    setAttackStartedAt(0);
    setIsPaused(false);
  };

  const quitRun = () => {
    setIsPaused(false);
    onQuit();
  };

  const handleAnswer = (answerIndex) => {
    if (isKilling || isPaused) return;
    setSelectedAnswer(answerIndex);
    const currentQuiz = quizzes[quizIndex];
    if (!currentQuiz) {
      setIsComplete(true);
      return;
    }

    const isCorrect = answerIndex === currentQuiz.answer;
    if (!isCorrect) {
      setCombo(0);
      setEnemyCount((count) => count + 1);
      setEnemyHealth((health) => [...health, Math.floor(Math.random() * 3) + 1]);
      setFeedback(`Wrong answer. Hint: ${currentQuiz.hint || `Inspect line ${currentQuiz.bug_line} and trace what it changes.`}`);
      setTimeout(() => setSelectedAnswer(null), 500);
      return;
    }

    const nextCombo = combo + 1;
    setCombo(nextCombo);
    const coinRoll = Math.random();
    const reward = coinRoll < 0.45 ? 1 : coinRoll < 0.72 ? 2 : coinRoll < 0.88 ? 3 : coinRoll < 0.97 ? 4 : 5;
    setCoins((total) => total + reward);
    setFeedback(nextCombo > 1 ? `${nextCombo}x combo! +${reward} coin${reward === 1 ? '' : 's'}` : `Correct. +${reward} coin${reward === 1 ? '' : 's'}`);
    setAttackNonce((nonce) => nonce + 1);
    setAttackStartedAt(Date.now());
    setIsKilling(true);

    const aliveEnemies = enemies
      .map((enemy, index) => index)
      .filter((index) => !killedEnemies.includes(index));
    const quizzesRemaining = quizzes.length - quizIndex;
    const strikeCount = quizzesRemaining === 1
      ? aliveEnemies.length
      : Math.max(1, Math.ceil(aliveEnemies.length / quizzesRemaining));
    const targets = aliveEnemies.slice(0, strikeCount);
    const deaths = targets.filter((index) => (enemyHealth[index] || 1) <= 1);
    const deathTargets = quizzesRemaining === 1 ? aliveEnemies : deaths;
    setDyingEnemies(deathTargets);
    setKillCombo(deathTargets.length > 3 ? deathTargets.length : 0);
    if (deathTargets.length > 3) {
      setTimeout(() => setKillCombo(0), 3600);
    }

    setTimeout(() => {
      const remainingHealth = enemyHealth.map((value, index) => (
        targets.includes(index) ? Math.max(0, value - 1) : value
      ));
      if (quizzesRemaining === 1) {
        targets.push(...aliveEnemies.filter((index) => !targets.includes(index)));
        deaths.push(...aliveEnemies.filter((index) => !deaths.includes(index)));
      }
      setEnemyHealth(remainingHealth);
      setKilledEnemies((previous) => [...new Set([...previous, ...deathTargets])]);

      setTimeout(() => {
        const nextIndex = quizIndex + 1;
        if (deathTargets.length < targets.length) {
          setSelectedAnswer(null);
          setIsKilling(false);
          setDyingEnemies([]);
          const woundedCount = targets.length - deaths.length;
          setFeedback(`Hit landed on ${targets.length} mobs. ${woundedCount} need another strike.`);
          return;
        }
        if (nextIndex >= quizzes.length) {
          setIsComplete(true);
          setIsKilling(false);
          setDyingEnemies([]);
          return;
        }

        setQuizIndex(nextIndex);
        setSelectedAnswer(null);
        setIsKilling(false);
        setDyingEnemies([]);
        setFeedback('');
      }, 1100);
    }, 2300);
  };

  const currentQuiz = quizzes[quizIndex];

  return (
    <div className="game-panel">
      <div className="game-header">
        <div>
          <p className="eyebrow">Arcade run</p>
          <h2>Bug dungeon</h2>
        </div>
        <div className="stats">
          <span className="coin-stat">coins {coins}</span>
          <span className={combo > 1 ? 'combo-stat active' : 'combo-stat'}>combo {combo}x</span>
        </div>
      </div>

      <div className="game-canvas">
        <DungeonCanvas
          enemies={enemies}
          killedEnemies={killedEnemies}
          dyingEnemies={dyingEnemies}
          isKilling={isKilling}
          targetIndex={quizIndex}
          attackNonce={attackNonce}
          attackStartedAt={attackStartedAt}
        />
        <button className="pause-button" onClick={() => setIsPaused(true)} disabled={isPaused} aria-label="Pause game">
          II
        </button>
        {isPaused ? (
          <div className="pause-menu">
            <p className="eyebrow">Run paused</p>
            <h3>Dungeon menu</h3>
            <button onClick={() => setIsPaused(false)}>Resume</button>
            <button onClick={restartRun}>Restart run</button>
            <button className="quit-button" onClick={quitRun}>Quit to code</button>
          </div>
        ) : null}
        {killCombo > 3 ? (
          <div className="kill-combo" aria-live="polite">
            <strong>COMBO!!</strong>
            <span>x{killCombo}</span>
          </div>
        ) : null}
      </div>

      {!isComplete && currentQuiz ? (
        <div className="quiz-card">
          <div className="quiz-heading">
            <div>
              <p className="eyebrow">Lesson {quizIndex + 1} of {quizzes.length}</p>
              <h3>{currentQuiz.topic || 'Debugging lesson'}</h3>
            </div>
            <span className="line-badge">line {currentQuiz.bug_line}</span>
          </div>
          <p>{currentQuiz.question}</p>
          <p className="quiz-hint">Focus: {currentQuiz.hint}</p>
          {feedback ? (
            <p className={feedback.startsWith('Wrong') ? 'quiz-feedback wrong' : 'quiz-feedback'}>
              {feedback}
            </p>
          ) : null}
          <div className="quiz-options">
            {currentQuiz.options.map((option, index) => (
              <button
                key={option}
                className={selectedAnswer === index ? 'answer-button selected' : 'answer-button'}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null || isKilling}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="victory-panel">
          <h3>Dungeon cleared</h3>
          <p>The codebase is clean and the bugs are fixed.</p>
          <pre>{cleanCode}</pre>
          <button onClick={() => navigator.clipboard.writeText(cleanCode || '')}>Copy clean code</button>
        </div>
      )}
    </div>
  );
}
