'use client';
import { useState, useEffect, useMemo } from 'react';
import { Brain, Sparkles, Code2, Lightbulb, Cpu, Zap, BookOpen } from 'lucide-react';

// ─── Curated tech tips — no API calls needed, always instant ───────────────
const TECH_TIPS = [
  { icon: '💡', text: 'The first computer bug was an actual bug — a moth found in a Harvard Mark II relay in 1947.' },
  { icon: '🐍', text: 'Python\'s name comes from "Monty Python\'s Flying Circus," not the snake.' },
  { icon: '⚡', text: 'The first website ever created is still online at info.cern.ch — published in 1991.' },
  { icon: '🎮', text: 'The original Super Mario Bros. game was only 40KB — smaller than most images today.' },
  { icon: '🔑', text: 'The "Hello, World!" tradition started with Brian Kernighan\'s C programming book in 1978.' },
  { icon: '🌍', text: 'Over 700 programming languages exist, but fewer than 50 are widely used professionally.' },
  { icon: '🚀', text: 'NASA\'s Apollo 11 guidance computer had just 74KB of memory and ran at 0.043 MHz.' },
  { icon: '☕', text: 'Java was originally called "Oak" after a tree outside James Gosling\'s office window.' },
  { icon: '🦀', text: 'Rust has been voted the "most loved" programming language for multiple consecutive years.' },
  { icon: '🐧', text: 'Linux was created by Linus Torvalds as a hobby project in 1991 while he was a university student.' },
  { icon: '🌐', text: 'JavaScript was designed and implemented in just 10 days by Brendan Eich in May 1995.' },
  { icon: '📱', text: 'The first text message ever sent was "Merry Christmas" on December 3, 1992.' },
  { icon: '🧮', text: 'Ada Lovelace is considered the world\'s first computer programmer, writing code in the 1840s.' },
  { icon: '💾', text: 'A single Google search uses about 1,000 computers in 0.2 seconds to retrieve an answer.' },
  { icon: '🔮', text: 'Git was created by Linus Torvalds in just 2 weeks because he was unhappy with existing tools.' },
  { icon: '🏗️', text: 'The average website today is larger than the entire game DOOM (1993) which was 2.39MB.' },
  { icon: '🤖', text: 'The term "Artificial Intelligence" was coined at the Dartmouth Conference in 1956.' },
  { icon: '⌨️', text: 'The QWERTY keyboard layout was designed in 1873 to prevent typewriter keys from jamming.' },
  { icon: '🔐', text: 'The most common password in the world is still "123456" — please don\'t use it!' },
  { icon: '📊', text: '90% of the world\'s data was created in just the last two years.' },
  { icon: '🧬', text: 'DNA can store 215 petabytes per gram — it\'s the ultimate storage medium.' },
  { icon: '🎯', text: 'TypeScript was developed by Microsoft and released in 2012 to make JavaScript more scalable.' },
  { icon: '🐳', text: 'Docker containers can start in under 50ms, compared to minutes for traditional VMs.' },
  { icon: '☁️', text: 'AWS started as internal infrastructure at Amazon and launched publicly in 2006.' },
  { icon: '🧩', text: 'React was first deployed on Facebook\'s News Feed in 2011, then open-sourced in 2013.' },
  { icon: '🍎', text: 'The Apple I computer, built in 1976, was priced at $666.66 because Steve Wozniak liked repeating digits.' },
  { icon: '🕸️', text: 'The concept of "hypertext" (the HT in HTML) was coined by Ted Nelson in 1963.' },
  { icon: '👻', text: 'Snapchat was originally called "Picaboo" when it launched in 2011.' },
  { icon: '📦', text: 'Amazon was almost named "Cadabra", as in "abracadabra", until a lawyer misheard it as "cadaver".' },
  { icon: '💾', text: 'The "Save" icon in most software is a 3.5-inch floppy disk, which holds a tiny 1.44MB of data.' },
  { icon: '👾', text: 'The first computer virus in the wild was the "Elk Cloner", written in 1982 by a 15-year-old high school student.' },
  { icon: '🎨', text: 'CSS was proposed by Håkon Wium Lie in 1994 to style web pages without changing their HTML structure.' },
  { icon: '🐹', text: 'Go (Golang) was designed at Google by Robert Griesemer, Rob Pike, and Ken Thompson in 2007.' },
  { icon: '💎', text: 'Ruby was designed by Yukihiro Matsumoto in 1995 to be a language that is "natural, not simple".' },
  { icon: '🐘', text: 'PHP originally stood for "Personal Home Page", but now stands for "PHP: Hypertext Preprocessor".' },
  { icon: '🔍', text: 'Google\'s original name was "BackRub" before it was renamed to Google.' },
  { icon: '📡', text: 'Wi-Fi doesn\'t stand for anything. It is not short for "Wireless Fidelity" — that\'s a myth.' },
  { icon: '🖥️', text: 'The first domain name ever registered was symbolics.com on March 15, 1985.' },
  { icon: '📈', text: 'GitHub was launched in 2008 and acquired by Microsoft in 2018 for $7.5 billion.' },
  { icon: '📱', text: 'The first iPhone (2007) had 128MB of RAM, compared to 8GB or more in modern smartphones.' },
  { icon: '🌐', text: 'The World Wide Web was made publicly available on August 6, 1991.' },
  { icon: '⏳', text: 'The UNIX epoch (time 0) started at midnight on January 1, 1970.' },
  { icon: '🧩', text: 'Stack Overflow was founded in 2008 by Jeff Atwood and Joel Spolsky.' },
  { icon: '🚀', text: 'SpaceX uses a modified version of Linux to run the Falcon 9 rockets.' },
  { icon: '🧠', text: 'Alan Turing is widely considered the father of theoretical computer science and artificial intelligence.' },
  { icon: '📚', text: 'Wikipedia went online on January 15, 2001, and originally ran on UseModWiki software.' },
  { icon: '☁️', text: 'GitHub holds over 300 million repositories as of 2023, making it the largest source code host in the world.' },
  { icon: '🎮', text: 'The PlayStation 2 is the best-selling video game console of all time, with over 155 million units sold.' },
  { icon: '⚙️', text: 'The first mechanical computer, the Antikythera mechanism, was built by ancient Greeks around 100 BC.' },
  { icon: '🔗', text: 'Blockchain technology was first described in 1991, long before Bitcoin was invented.' },
];

// ─── Progress stages for different content types ───────────────────────────
const THEORY_STAGES = [
  { label: 'Analyzing topic', icon: Brain, duration: 3500 },
  { label: 'Researching concepts', icon: BookOpen, duration: 4000 },
  { label: 'Structuring content', icon: Code2, duration: 4500 },
  { label: 'Writing theory', icon: Sparkles, duration: 99999 },
];

const QUIZ_STAGES = [
  { label: 'Analyzing difficulty', icon: Cpu, duration: 3000 },
  { label: 'Crafting questions', icon: Lightbulb, duration: 4000 },
  { label: 'Building adaptive tree', icon: Zap, duration: 4500 },
  { label: 'Finalizing quiz', icon: Sparkles, duration: 99999 },
];

export default function LoadingExperience({ topic, type = 'theory' }) {
  const stages = type === 'theory' ? THEORY_STAGES : QUIZ_STAGES;
  const [currentStage, setCurrentStage] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TECH_TIPS.length));
  const [tipFading, setTipFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Shuffle tips on mount so order is unique each time
  const shuffledTips = useMemo(() => {
    const arr = [...TECH_TIPS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  // Cycle through progress stages
  useEffect(() => {
    const timers = [];
    let totalDelay = 0;
    stages.forEach((stage, i) => {
      if (i === 0) return; // Start at stage 0
      totalDelay += stages[i - 1].duration;
      timers.push(setTimeout(() => setCurrentStage(i), totalDelay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate tips every 8 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex(prev => (prev + 1) % shuffledTips.length);
        setTipFading(false);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [shuffledTips.length]);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const tip = shuffledTips[tipIndex % shuffledTips.length];
  const StageIcon = stages[currentStage].icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
      {/* Animated brain/icon */}
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center loading-icon-pulse"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
        >
          <StageIcon className="w-7 h-7 text-purple-400" />
        </div>
        {/* Orbiting dots */}
        <div className="loading-orbit">
          <div className="loading-orbit-dot" style={{ '--delay': '0s', '--color': '#7c3aed' }} />
          <div className="loading-orbit-dot" style={{ '--delay': '1s', '--color': '#06b6d4' }} />
          <div className="loading-orbit-dot" style={{ '--delay': '2s', '--color': '#f59e0b' }} />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-slate-200 text-sm font-semibold mb-1">
          {type === 'theory' ? 'Generating Theory' : 'Generating Questions'}
        </p>
        <p className="text-purple-400 text-xs font-code flex items-center justify-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          {stages[currentStage].label}...
        </p>
      </div>

      {/* Progress stages */}
      <div className="flex items-center gap-2">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full transition-all duration-500"
              style={{
                background: i <= currentStage ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                boxShadow: i <= currentStage ? '0 0 8px rgba(124,58,237,0.5)' : 'none',
                transform: i === currentStage ? 'scale(1.4)' : 'scale(1)',
              }}
            />
            {i < stages.length - 1 && (
              <div
                className="w-8 h-px transition-all duration-500"
                style={{
                  background: i < currentStage
                    ? 'linear-gradient(90deg, #7c3aed, #06b6d4)'
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Tech tip card */}
      <div
        className="max-w-md w-full rounded-xl p-4 transition-all duration-300"
        style={{
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.15)',
          opacity: tipFading ? 0 : 1,
          transform: tipFading ? 'translateY(4px)' : 'translateY(0)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-code text-amber-400/70 uppercase tracking-wider">
            Did you know?
          </span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          <span className="mr-1.5">{tip.icon}</span>
          {tip.text}
        </p>
      </div>

      {/* Elapsed time */}
      <p className="text-slate-600 text-[10px] font-code">
        {elapsed}s elapsed • {topic}
      </p>
    </div>
  );
}
