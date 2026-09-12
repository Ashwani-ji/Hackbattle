"use client";

import { useState } from "react";

export default function QuizModal({ quiz, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) return null;

  const isCorrect = selected === quiz.answer;

  function submit() {
    if (selected === null) return;
    setSubmitted(true);
  }

  function proceed() {
    onAnswer(isCorrect);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Bug encountered {quiz.bug_line ? `(line ${quiz.bug_line})` : ""}</h3>
        <p>{quiz.question}</p>
        <div className="options">
          {quiz.options.map((opt, i) => (
            <button
              key={i}
              className={`option ${selected === i ? "selected" : ""} ${
                submitted && i === quiz.answer ? "correct" : ""
              } ${submitted && selected === i && i !== quiz.answer ? "wrong" : ""}`}
              onClick={() => !submitted && setSelected(i)}
              disabled={submitted}
            >
              {opt}
            </button>
          ))}
        </div>

        {!submitted ? (
          <button className="primary" onClick={submit} disabled={selected === null}>
            Submit Answer
          </button>
        ) : (
          <div className="feedback">
            <p>{isCorrect ? "✅ Correct! Bug squashed." : "❌ Not quite — bug respawns."}</p>
            <button className="primary" onClick={proceed}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
