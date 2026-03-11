'use client';
import { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

const LEVEL_META = {
  1: { name: 'Beginner', icon: '🌱', color: 'text-green-400', badge: 'badge-easy', tagBg: 'rgba(16,185,129,0.1)', tagColor: '#10b981' },
  2: { name: 'Intermediate', icon: '🔥', color: 'text-amber-400', badge: 'badge-medium', tagBg: 'rgba(245,158,11,0.1)', tagColor: '#f59e0b' },
  3: { name: 'Advanced', icon: '⚡', color: 'text-red-400', badge: 'badge-hard', tagBg: 'rgba(239,68,68,0.1)', tagColor: '#ef4444' },
};

function renderMarkdown(text) {
  // Clean up excessive blank lines in code blocks first
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cleanedCode = code
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .replace(/\n\n\n/g, '\n\n');
    return `<pre><code class="lang-${lang || ''}">${cleanedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
  });

  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p>$1</p>')
    .replace(/\n\n+/g, '');
}

export default function TheoryScreen({ topic, level, onDone }) {
  const [theory, setTheory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const meta = LEVEL_META[level];

  const fetchTheory = async (signal) => {
    setLoading(true);
    setError('');
    setTheory('');
    try {
      const res = await fetch('/api/theory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level }),
        signal,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTheory(data.theory);
    } catch (err) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      setError(err.message || 'Failed to load theory');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTheory(controller.signal);
    return () => controller.abort();
  }, [topic, level]);

  return (
    <div className="h-screen flex flex-col px-4 py-4 animate-in overflow-hidden">
      {/* top bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="font-bold text-slate-200 text-sm">{topic}</div>
            <div className="text-xs text-slate-500 font-code">Theory — Level {level} of 3</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${meta.badge}`}>{meta.icon} {meta.name}</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-1.5 rounded-full transition-all" style={{
                background: i <= level ? '#7c3aed' : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Main content - fills remaining space */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-0">
        {/* Theory card */}
        <div className="theory-card flex flex-col mb-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5 shrink-0">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <h2 className="font-extrabold text-lg text-slate-100">{topic} — {meta.name} Concepts</h2>
              <p className="text-slate-500 text-xs font-code">Read carefully before answering questions</p>
            </div>
          </div>

          {loading && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="pulse-dot" />
                <span className="text-slate-400 text-sm font-code">Generating theory...</span>
              </div>
              <div className="space-y-3 flex-1">
                {/* Heading shimmer */}
                <div className="shimmer h-6 rounded" style={{ width: '55%', opacity: 0.7 }} />
                <div className="h-1" />
                {/* Paragraph 1 */}
                {[100, 85, 92, 70, 88, 60, 75].map((w, i) => (
                  <div key={`a${i}`} className="shimmer h-4 rounded" style={{ width: `${w}%`, opacity: 0.6 }} />
                ))}

                <div className="h-2" />
                {/* Heading 2 */}
                <div className="shimmer h-6 rounded" style={{ width: '45%', opacity: 0.7 }} />
                <div className="h-1" />
                {/* Paragraph 2 */}
                {[95, 78, 88, 65, 90, 72].map((w, i) => (
                  <div key={`b${i}`} className="shimmer h-4 rounded" style={{ width: `${w}%`, opacity: 0.6 }} />
                ))}

                <div className="h-2" />
                {/* Code block shimmer */}
                <div className="shimmer h-24 rounded-lg" style={{ width: '80%', opacity: 0.4 }} />
                <div className="h-2" />
                {/* Paragraph 3 */}
                {[88, 94, 72, 80, 68].map((w, i) => (
                  <div key={`c${i}`} className="shimmer h-4 rounded" style={{ width: `${w}%`, opacity: 0.6 }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold mb-1">Failed to generate theory</p>
                <p className="text-red-400/70 text-xs font-code mb-3">{error}</p>
                <button onClick={fetchTheory} className="flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            </div>
          )}

          {theory && !loading && (
            <div
              className="theory-content flex-1 overflow-y-auto pr-2 theory-scroll"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(theory) }}
            />
          )}
        </div>

        {!loading && !error && theory && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 gap-3 bg-purple-600/10 border border-purple-500/20 rounded-xl animate-in mt-2 shrink-0">
            <div className="text-center sm:text-left">
              <p className="text-slate-300 text-sm font-semibold">Ready to test your knowledge?</p>
              <p className="text-slate-500 text-xs font-code mt-0.5">5 adaptive questions • difficulty adjusts per answer</p>
            </div>
            <button onClick={() => onDone(theory)} className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap py-3 px-6 w-full sm:w-auto">
              Start Quiz <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
