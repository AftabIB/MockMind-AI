'use client';
import { Trophy, TrendingUp, ChevronRight, X } from 'lucide-react';

const LEVEL_META = {
  1: { name: 'Beginner', icon: '🌱', next: 'Intermediate', nextIcon: '🔥' },
  2: { name: 'Intermediate', icon: '🔥', next: 'Advanced', nextIcon: '⚡' },
};

function getMessage(correct) {
  if (correct >= 5) return { text: "Outstanding! 🏆", sub: "You've truly mastered this level!" };
  if (correct >= 4) return { text: "Great work! 🎯", sub: "Solid understanding demonstrated." };
  if (correct >= 3) return { text: "Well done! 💪", sub: "Good grasp of the fundamentals." };
  return { text: "Keep going! 📚", sub: "Every attempt builds knowledge." };
}

export default function LevelUpScreen({ topic, currentLevel, score, onDecide }) {
  const meta = LEVEL_META[currentLevel];
  const correct = score?.correct || 0;
  const total = score?.total || 5;
  const pct = Math.round((correct / total) * 100);
  const msg = getMessage(correct);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-4 animate-in">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 text-sm font-code mb-4">
            <Trophy className="w-4 h-4" />
            Level {currentLevel} Complete
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 mb-2">{msg.text}</h1>
          <p className="text-slate-400">{msg.sub}</p>
        </div>

        {/* Score ring */}
        <div className="flex justify-center mb-4">
          <div className="relative w-36 h-36">
            <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
              <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="72" cy="72" r={radius}
                fill="none"
                stroke={pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${pct >= 70 ? '#10b981' : '#f59e0b'})` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100">{correct}</span>
              <span className="text-slate-500 text-sm font-code">/ {total}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Score', value: `${pct}%`, color: pct >= 70 ? '#10b981' : '#f59e0b' },
            { label: 'Correct', value: correct, color: '#10b981' },
            { label: 'Wrong', value: total - correct, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="theory-card text-center py-4">
              <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 font-code mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="theory-card border-animated mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{meta.nextIcon}</div>
            <div>
              <p className="font-bold text-slate-200">Ready for the next challenge?</p>
              <p className="text-slate-500 text-sm">
                <span className="font-code text-slate-400">{meta.next}</span> level — theory + 5 harder questions
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onDecide(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" /> Go to {meta.next}
            </button>
            <button
              onClick={() => onDecide(false)}
              className="btn-secondary flex items-center justify-center gap-2 px-4"
            >
              <X className="w-4 h-4" /> End Here
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 font-code">
          {topic} • Level {currentLevel}/{3} complete
        </p>
      </div>
    </div>
  );
}
