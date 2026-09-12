'use client';

import { useEffect, useMemo, useState } from 'react';
import DungeonCanvas from './DungeonCanvas';

export default function CodeCrawlGame({ metrics, quizzes, cleanCode }) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [killedEnemies, setKilledEnemies] = useState([]);
  const [isKilling, setIsKilling] = useState(false);
  const [enemyCount, setEnemyCount] = useState(Math.max(1, metrics?.bug_count || 1));
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState('');

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
    setEnemyCount(Math.max(1, metrics?.bug_count || 1));
    setCombo(0);
    setFeedback('');
  }, [metrics, quizzes]);

  const handleAnswer = (answerIndex) => {
    if (isKilling) return;
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
      setFeedback('Wrong path. A crawler multiplied. Try the lesson again.');
      setTimeout(() => setSelectedAnswer(null), 500);
      return;
    }

    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setFeedback(nextCombo > 1 ? `${nextCombo}x debugging combo!` : 'Correct. Crawler exposed.');
    setIsKilling(true);

    setTimeout(() => {
      setKilledEnemies((previous) => [...new Set([...previous, quizIndex])]);

      setTimeout(() => {
        const nextIndex = quizIndex + 1;
        if (nextIndex >= quizzes.length) {
          setIsComplete(true);
          setIsKilling(false);
          return;
        }

        setQuizIndex(nextIndex);
        setSelectedAnswer(null);
        setIsKilling(false);
        setFeedback('');
      }, 420);
    }, 380);
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
          <span>complexity {metrics?.complexity_score ?? 0}</span>
          <span>bugs {enemies.length}</span>
          <span className={combo > 1 ? 'combo-stat active' : 'combo-stat'}>combo {combo}x</span>
        </div>
      </div>

      <div className="game-canvas">
        <DungeonCanvas
          enemies={enemies}
          killedEnemies={killedEnemies}
          isKilling={isKilling}
          targetIndex={quizIndex}
        />
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
