'use client';
import { useState } from 'react';
import { Brain, Zap, Target, TrendingUp, ChevronRight, Code2 } from 'lucide-react';

const POPULAR_TOPICS = [
  { name: 'Python', icon: '🐍', color: '#3b82f6' },
  { name: 'JavaScript', icon: '⚡', color: '#f59e0b' },
  { name: 'React', icon: '⚛️', color: '#06b6d4' },
  { name: 'TypeScript', icon: '🔷', color: '#3b82f6' },
  { name: 'Node.js', icon: '🟢', color: '#10b981' },
  { name: 'SQL', icon: '🗄️', color: '#8b5cf6' },
  { name: 'Java', icon: '☕', color: '#f97316' },
  { name: 'C++', icon: '⚙️', color: '#64748b' },
  { name: 'Go', icon: '🐹', color: '#06b6d4' },
  { name: 'Rust', icon: '🦀', color: '#f97316' },
  { name: 'Docker', icon: '🐳', color: '#3b82f6' },
  { name: 'AWS', icon: '☁️', color: '#f59e0b' },
  { name: 'Machine Learning', icon: '🤖', color: '#8b5cf6' },
  { name: 'Next.js', icon: '▲', color: '#e2e8f0' },
  { name: 'MongoDB', icon: '🍃', color: '#10b981' },
];

export default function LandingScreen({ onStart }) {
  const [customTopic, setCustomTopic] = useState('');
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (name) => {
    setSelected(name);
    setCustomTopic('');
    setError('');
  };

  const handleCustomChange = (e) => {
    setCustomTopic(e.target.value);
    setSelected('');
    setError('');
  };

  const handleStart = () => {
    const topic = customTopic.trim() || selected;
    if (!topic) {
      setError('Please select or type a topic to continue');
      return;
    }
    onStart(topic);
  };

  const activeTopic = customTopic.trim() || selected;

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 py-6 animate-in overflow-hidden">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center glow-purple">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            Mock<span style={{ color: '#7c3aed' }}>Mind</span>
            <span className="text-xs ml-2 font-code text-purple-400 align-middle badge badge-easy">AI</span>
          </h1>
        </div>
        <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
          AI-powered adaptive mock tests. Learn theory, answer questions, level up through{' '}
          <span className="text-purple-400 font-semibold">3 progressive stages</span>.
        </p>
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[
          { icon: <Target className="w-3.5 h-3.5" />, label: 'Adaptive Difficulty', color: 'text-green-400' },
          { icon: <TrendingUp className="w-3.5 h-3.5" />, label: '3 Progressive Levels', color: 'text-cyan-400' },
          { icon: <Zap className="w-3.5 h-3.5" />, label: 'AI-Generated Content', color: 'text-amber-400' },
          { icon: <Code2 className="w-3.5 h-3.5" />, label: 'Any Tech Stack', color: 'text-purple-400' },
        ].map(f => (
          <div key={f.label} className={`flex items-center gap-1.5 text-xs ${f.color} bg-white/5 border border-white/10 px-2.5 py-1 rounded-full`}>
            {f.icon} {f.label}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-3xl border-animated rounded-2xl" style={{ background: '#111118', padding: '24px 28px' }}>
        <h2 className="text-base font-bold text-slate-200 mb-1">Choose Your Topic</h2>
        <p className="text-xs text-slate-500 mb-4 font-code">Select from popular topics or type anything</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {POPULAR_TOPICS.map(t => (
            <button
              key={t.name}
              onClick={() => handleSelect(t.name)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 border ${selected === t.name
                ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-purple-500/50 hover:text-slate-200'
                }`}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Code2 className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Or type any topic: Flutter, Kubernetes, GraphQL..."
            value={customTopic}
            onChange={handleCustomChange}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all text-sm"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-3 font-code">⚠ {error}</p>
        )}

        <button
          onClick={handleStart}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
        >
          {activeTopic ? (
            <>Start Learning {activeTopic} <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Select a Topic to Begin <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="mt-5 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-600 mb-2 font-code uppercase tracking-wider">How it works</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: '01', title: 'Read Theory', desc: 'AI generates focused learning content' },
              { step: '02', title: 'Take Quiz', desc: '5 adaptive questions per level' },
              { step: '03', title: 'Level Up', desc: '3 levels: Beginner → Advanced' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="text-purple-500 font-code text-xs mb-0.5">{s.step}</div>
                <div className="text-slate-300 text-xs font-semibold mb-0.5">{s.title}</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-500 font-code mt-3">
        {' Built by '}
        <span className="text-purple-400 font-medium">Aftab</span>
      </p>
    </div>
  );
}
