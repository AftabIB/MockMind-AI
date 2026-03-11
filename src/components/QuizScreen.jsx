'use client';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const LEVEL_META = {
  1: { name: 'Beginner', icon: '🌱', badge: 'badge-easy' },
  2: { name: 'Intermediate', icon: '🔥', badge: 'badge-medium' },
  3: { name: 'Advanced', icon: '⚡', badge: 'badge-hard' },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const TOTAL = 5; // User answers 5 out of 7 generated

// Format question text: handle triple-backtick code blocks + inline code
function formatQuestionText(text) {
  let formatted = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const cleanCode = code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre style="background:#0c0c18;border:1px solid #1e1e30;border-radius:10px;padding:12px 14px;margin:8px 0;overflow-x:auto"><code style="font-family:JetBrains Mono,Fira Code,monospace;font-size:0.82em;color:#e2e8f0;line-height:1.5;white-space:pre">${cleanCode}</code></pre>`;
  });
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.2);color:#c4b5fd;padding:2px 5px;border-radius:4px;font-family:JetBrains Mono,Fira Code,monospace;font-size:0.88em">$1</code>');
  return formatted;
}

// ─── Decision Tree Logic ───────────────────────────────────────────────────
// The 7 questions are indexed as:
//   0: q1  (Easy Normal)      → Always shown first
//   1: q2a (Easy Tricky)      → Shown if Q1 correct
//   2: q2b (Easy Simple)      → Shown if Q1 wrong
//   3: q3  (Medium Normal)    → Always shown third
//   4: q4a (Medium Tricky)    → Shown if Q3 correct
//   5: q4b (Medium Simple)    → Shown if Q3 wrong
//   6: q5  (Hard)             → Always shown last

function getNextQuestionIndex(stepNumber, answers, questions) {
  switch (stepNumber) {
    case 0: return 0; // Q1: always index 0
    case 1: {
      // Q2: if Q1 was correct → q2a (index 1), else → q2b (index 2)
      const q1Correct = answers[0]?.isCorrect;
      return q1Correct ? 1 : 2;
    }
    case 2: return 3; // Q3: always index 3
    case 3: {
      // Q4: if Q3 was correct → q4a (index 4), else → q4b (index 5)
      const q3Correct = answers[2]?.isCorrect;
      return q3Correct ? 4 : 5;
    }
    case 4: return 6; // Q5: always index 6
    default: return 0;
  }
}



export default function QuizScreen({ topic, level, theoryText, askedQuestions, onComplete }) {
  const [allQuestions, setAllQuestions] = useState([]);  // All 7 questions
  const [stepNumber, setStepNumber] = useState(0);       // Current step (0-4)
  const [currentQIndex, setCurrentQIndex] = useState(0);  // Index in allQuestions array
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const meta = LEVEL_META[level];

  // Fetch ALL 7 questions in one batch API call
  const fetchAllQuestions = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          level,
          askedQuestions,
          theoryText: theoryText || '',
        }),
        signal,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions were generated. Please try again.');
      }

      setAllQuestions(data.questions);
      setStepNumber(0);
      setCurrentQIndex(0);
      setAnswers([]);

    } catch (err) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      setError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [topic, level, askedQuestions, theoryText]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllQuestions(controller.signal);
    return () => controller.abort();
  }, []);

  const currentQuestion = allQuestions[currentQIndex] || null;
  const correctSoFar = answers.filter(a => a.isCorrect).length;

  const handleSelect = (optionIdx) => {
    if (showResult || loading || !currentQuestion) return;
    setSelectedOption(optionIdx);
  };

  const handleSubmit = () => {
    if (selectedOption === null || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.correct;
    setShowResult(true);

    const newAnswer = {
      questionText: currentQuestion.question,
      options: currentQuestion.options,
      selected: selectedOption,
      correct: currentQuestion.correct,
      isCorrect,
      difficulty: currentQuestion.difficulty,
      role: currentQuestion.role,
      explanation: currentQuestion.explanation,
    };

    setAnswers(prev => [...prev, newAnswer]);
  };

  const handleNext = () => {
    const nextStep = stepNumber + 1;
    if (nextStep >= TOTAL) {
      // Quiz complete
      const finalAnswers = answers;
      const finalScore = finalAnswers.filter(a => a.isCorrect).length;
      const allAskedTexts = allQuestions.map(q => q.question);
      onComplete(finalScore, finalAnswers, allAskedTexts);
      return;
    }

    // Get the next question index from the decision tree
    const updatedAnswers = answers; // answers already includes the latest
    const nextQIndex = getNextQuestionIndex(nextStep, updatedAnswers, allQuestions);

    setStepNumber(nextStep);
    setCurrentQIndex(nextQIndex);
    setSelectedOption(null);
    setShowResult(false);
  };

  const progressPct = ((stepNumber + (showResult ? 1 : 0)) / TOTAL) * 100;

  return (
    <div className="h-screen flex flex-col items-center quiz-container px-4 py-4 animate-in overflow-hidden">
      <div className="w-full max-w-4xl mb-3 shrink-0">
        <div className="quiz-header flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`badge ${meta.badge}`}>{meta.icon} {meta.name}</span>
            <span className="text-slate-500 text-xs font-code quiz-topic-label">{topic}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400 font-code text-xs">✓ {correctSoFar}</span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-slate-400 font-code text-xs">{answers.length} answered</span>
          </div>
        </div>
        {/* Progress */}
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-1">
          <div className="progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="quiz-status-row flex justify-between items-center text-[10px] text-slate-600 font-code">
          <span>Question {stepNumber + 1} of {TOTAL}</span>
          {currentQuestion && (
            <span style={{ color: currentQuestion.difficulty === 'easy' ? '#10b981' : currentQuestion.difficulty === 'medium' ? '#f59e0b' : '#ef4444' }}>
              {currentQuestion.difficulty.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Question card */}
      <div className="w-full max-w-4xl flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden quiz-scroll">
        {loading && (
          <div className="theory-card flex flex-col items-center justify-center py-12">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin mb-2" />
            <p className="text-slate-400 text-sm font-code">Generating adaptive questions...</p>
            <p className="text-slate-600 text-xs font-code mt-1">This may take a moment</p>
          </div>
        )}

        {error && !loading && (
          <div className="theory-card flex flex-col items-center gap-3 py-8">
            <AlertCircle className="w-7 h-7 text-red-400" />
            <p className="text-red-300 text-sm text-center">{error}</p>
            <button onClick={fetchAllQuestions} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {currentQuestion && !loading && (
          <div key={`${stepNumber}-${currentQIndex}`} className="animate-in flex flex-col">
            {/* Question */}
            <div className="theory-card mb-3 quiz-question-card">
              <div className="flex items-start gap-3">
                <span className="font-code text-purple-400 text-sm shrink-0 mt-0.5">Q{stepNumber + 1}.</span>
                <div className="text-slate-200 text-sm leading-relaxed font-code"
                  dangerouslySetInnerHTML={{ __html: formatQuestionText(currentQuestion.question) }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`badge badge-${currentQuestion.difficulty}`}>
                  {currentQuestion.difficulty === 'easy' ? '🟢' : currentQuestion.difficulty === 'medium' ? '🟡' : '🔴'} {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-3">
              {currentQuestion.options.map((opt, idx) => {
                let cls = 'option-card';
                if (showResult) {
                  if (idx === currentQuestion.correct) cls += ' correct';
                  else if (idx === selectedOption && idx !== currentQuestion.correct) cls += ' wrong';
                  cls += ' disabled';
                } else if (selectedOption === idx) {
                  cls += ' selected';
                }

                return (
                  <button
                    key={idx}
                    className={`${cls} w-full text-left flex items-center gap-3`}
                    onClick={() => !showResult && handleSelect(idx)}
                  >
                    <span className={`option-letter w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold font-code shrink-0 transition-all ${showResult && idx === currentQuestion.correct
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : showResult && idx === selectedOption && idx !== currentQuestion.correct
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : selectedOption === idx
                          ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                          : 'bg-white/5 border-white/15 text-slate-500'
                      }`}>
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="text-xs font-code text-slate-300 flex-1"
                      dangerouslySetInnerHTML={{ __html: opt.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.2);color:#c4b5fd;padding:1px 4px;border-radius:3px">$1</code>') }}
                    />
                    {showResult && idx === currentQuestion.correct && (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    )}
                    {showResult && idx === selectedOption && idx !== currentQuestion.correct && (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showResult && (
              <div className={`p-3 rounded-xl mb-3 border animate-in ${selectedOption === currentQuestion.correct
                ? 'bg-green-500/10 border-green-500/25'
                : 'bg-red-500/10 border-red-500/25'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  {selectedOption === currentQuestion.correct ? (
                    <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-green-400 text-xs font-bold">Correct!</span></>
                  ) : (
                    <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400 text-xs font-bold">Incorrect</span></>
                  )}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action button */}
            <div className="quiz-action-row flex justify-end shrink-0 pb-2">
              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedOption === null}
                  className={`btn-primary quiz-submit-btn py-2.5 px-5 text-sm ${selectedOption === null ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  Submit Answer
                </button>
              ) : (
                <button onClick={handleNext} className="btn-primary quiz-submit-btn flex items-center gap-2 py-2.5 px-5 text-sm">
                  {stepNumber + 1 >= TOTAL ? '🎉 See Results' : 'Next Question →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
