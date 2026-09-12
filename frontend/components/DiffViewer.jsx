"use client";

import { diffLines } from "../lib/diff";

export default function DiffViewer({ original, cleaned }) {
  const lines = diffLines(original, cleaned);

  return (
    <div className="diff-viewer">
      {lines.map((line, idx) => (
        <div key={idx} className={`diff-line diff-${line.type}`}>
          <span className="diff-marker">
            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
          </span>
          <span className="diff-text">{line.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
