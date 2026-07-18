'use client';
import { Trophy, RotateCcw, Star, Award } from 'lucide-react';

const LEVEL_META = {
  1: { name: 'Beginner', icon: '🌱', badge: 'badge-easy' },
  2: { name: 'Intermediate', icon: '🔥', badge: 'badge-medium' },
  3: { name: 'Advanced', icon: '⚡', badge: 'badge-hard' },
};

function getOverallGrade(pct) {
  if (pct >= 90) return { grade: 'S', label: 'Expert', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  if (pct >= 75) return { grade: 'A', label: 'Proficient', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  if (pct >= 60) return { grade: 'B', label: 'Competent', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' };
  if (pct >= 45) return { grade: 'C', label: 'Learning', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' };
  return { grade: 'D', label: 'Keep Practicing', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
}

function getFeedback(topic, levelScores) {
  const levels = Object.keys(levelScores).map(Number);
  const maxLevel = Math.max(...levels);
  const totalCorrect = levels.reduce((a, l) => a + levelScores[l].correct, 0);
  const totalQ = levels.reduce((a, l) => a + levelScores[l].total, 0);
  const pct = Math.round((totalCorrect / totalQ) * 100);

  if (maxLevel === 3 && pct >= 80) return `Exceptional mastery of ${topic}! You've conquered all 3 levels with high accuracy.`;
  if (maxLevel === 3) return `You completed all 3 levels of ${topic}. Keep practicing the areas where you struggled.`;
  if (maxLevel === 2 && pct >= 70) return `Strong intermediate knowledge of ${topic}. The advanced level awaits!`;
  return `Good start with ${topic}! Review the theory and retry to improve.`;
}

export default function ScorecardScreen({ topic, levelScores, onRestart }) {
  const levels = Object.keys(levelScores).map(Number).sort();
  const totalCorrect = levels.reduce((a, l) => a + levelScores[l].correct, 0);
  const totalQ = levels.reduce((a, l) => a + levelScores[l].total, 0);
  const overallPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const grade = getOverallGrade(overallPct);
  const feedback = getFeedback(topic, levelScores);

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-4 animate-in overflow-hidden">
      <div className="w-full max-w-3xl flex flex-col gap-3">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-code mb-2">
            <Trophy className="w-3.5 h-3.5" /> Final Scorecard
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">{topic}</h1>
          <p className="text-slate-400 text-xs mt-0.5">Assessment complete • {levels.length} level{levels.length > 1 ? 's' : ''} completed</p>
        </div>

        {/* Grade card — compact */}
        <div className="theory-card text-center py-3" style={{ background: grade.bg, borderColor: grade.color + '40' }}>
          <div className="flex items-center justify-center gap-5">
            <div>
              <div className="text-5xl font-extrabold" style={{ color: grade.color, fontFamily: 'Inter' }}>{grade.grade}</div>
              <div className="text-xs font-code" style={{ color: grade.color }}>{grade.label}</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div>
              <div className="text-4xl font-extrabold text-slate-100">{overallPct}%</div>
              <div className="text-slate-400 text-xs font-code">{totalCorrect}/{totalQ} correct</div>
            </div>
          </div>
        </div>

        {/* Per-level breakdown — compact rows */}
        <div className="space-y-2">
          {levels.map(lvl => {
            const s = levelScores[lvl];
            const meta = LEVEL_META[lvl];
            const pct = Math.round((s.correct / s.total) * 100);
            return (
              <div key={lvl} className="theory-card flex items-center gap-3 py-2.5 px-4">
                <span className="text-lg w-6 text-center">{meta.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-300">Level {lvl} — {meta.name}</span>
                    <span className="font-code text-xs" style={{ color: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {s.correct}/{s.total} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                        boxShadow: `0 0 6px ${pct >= 70 ? '#10b981' : '#f59e0b'}80`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Levels not reached */}
          {[1, 2, 3].filter(l => !levels.includes(l)).map(lvl => {
            const meta = LEVEL_META[lvl];
            return (
              <div key={lvl} className="theory-card flex items-center gap-3 py-2.5 px-4 opacity-35">
                <span className="text-lg w-6 text-center grayscale">{meta.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500">Level {lvl} — {meta.name}</span>
                    <span className="font-code text-[10px] text-slate-600">Not attempted</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback + Stars in one row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex gap-2">
            <Award className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 text-xs leading-relaxed">{feedback}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {[1, 2, 3].map(i => (
              <Star
                key={i}
                className="w-6 h-6"
                style={{
                  color: i <= Math.ceil(levels.length * (overallPct / 100)) ? '#f59e0b' : '#1e293b',
                  fill: i <= Math.ceil(levels.length * (overallPct / 100)) ? '#f59e0b' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onRestart}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
        >
          <RotateCcw className="w-4 h-4" /> Try Another Topic
        </button>
        <p className="text-center text-[10px] text-slate-600 font-code">
          MockMind AI • Powered by Gemma 4
        </p>
      </div>
    </div>
  );
}
