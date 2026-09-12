'use client';

import { useRef } from 'react';

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function highlightLine(line) {
  let highlighted = escapeHtml(line);
  highlighted = highlighted.replace(/(#[^]*)$/, '<span class="syntax-comment">$1</span>');
  highlighted = highlighted.replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span class="syntax-string">$1</span>');
  highlighted = highlighted.replace(/\b(def|for|in|if|return|else|while|try|except|import|from|as|True|False|None)\b/g, '<span class="syntax-keyword">$1</span>');
  highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="syntax-number">$1</span>');
  highlighted = highlighted.replace(/(\+\+|--)/g, '<span class="syntax-danger">$1</span>');
  highlighted = highlighted.replace(/(\+=|-=|\*=|\/=)/g, '<span class="syntax-operator">$1</span>');
  return highlighted || ' ';
}

export default function CodeEditor({ value, onChange, placeholder, ariaLabel, compact = false, editorRef: externalEditorRef }) {
  const lines = value.split('\n');
  const highlightRef = useRef(null);
  const internalEditorRef = useRef(null);
  const editorRef = externalEditorRef || internalEditorRef;
  return (
    <div className={compact ? 'code-editor compact' : 'code-editor'}>
      <pre className="code-highlight" ref={highlightRef} aria-hidden="true">
        {lines.map((line, index) => {
          const isEdited = /\+\+|--/.test(line);
          return (
            <span
              className={isEdited ? 'code-line edited' : 'code-line'}
              key={`${index}-${line}`}
              dangerouslySetInnerHTML={{ __html: `${highlightLine(line)}\n` }}
            />
          );
        })}
      </pre>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        spellCheck="false"
        ref={editorRef}
        onScroll={(event) => {
          if (highlightRef.current) {
            highlightRef.current.scrollTop = event.currentTarget.scrollTop;
            highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
      />
    </div>
  );
}
