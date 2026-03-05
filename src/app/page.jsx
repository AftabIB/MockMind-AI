'use client';
import { useState, useCallback, useRef } from 'react';
import LandingScreen from '../components/LandingScreen';
import TheoryScreen from '../components/TheoryScreen';
import QuizScreen from '../components/QuizScreen';
import LevelUpScreen from '../components/LevelUpScreen';
import ScorecardScreen from '../components/ScorecardScreen';

export default function Home() {
  const [screen, setScreen] = useState('landing');
  const [topic, setTopic] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelScores, setLevelScores] = useState({});
  const askedQuestionsRef = useRef([]);
  const [theoryByLevel, setTheoryByLevel] = useState({});

  const handleStart = useCallback((selectedTopic) => {
    setTopic(selectedTopic);
    setCurrentLevel(1);
    setLevelScores({});
    setTheoryByLevel({});
    askedQuestionsRef.current = [];
    setScreen('theory');
  }, []);

  const handleTheoryDone = useCallback((theoryText) => {
    setTheoryByLevel(prev => ({ ...prev, [currentLevel]: theoryText }));
    setScreen('quiz');
  }, [currentLevel]);

  const handleLevelComplete = useCallback((score, answers, questionsAsked) => {
    askedQuestionsRef.current = [...askedQuestionsRef.current, ...questionsAsked];
    setLevelScores(prev => ({ ...prev, [currentLevel]: { correct: score, total: 5, answers } }));
    if (currentLevel >= 3) {
      setScreen('scorecard');
    } else {
      setScreen('levelup');
    }
  }, [currentLevel]);

  const handleLevelUp = useCallback((goNext) => {
    if (goNext) {
      setCurrentLevel(prev => prev + 1);
      setScreen('theory');
    } else {
      setScreen('scorecard');
    }
  }, []);

  const handleRestart = useCallback(() => {
    setScreen('landing');
    setTopic('');
    setCurrentLevel(1);
    setLevelScores({});
    setTheoryByLevel({});
    askedQuestionsRef.current = [];
  }, []);

  return (
    <div className="bg-grid h-screen overflow-hidden">
      {screen === 'landing' && <LandingScreen onStart={handleStart} />}
      {screen === 'theory' && (
        <TheoryScreen topic={topic} level={currentLevel} onDone={handleTheoryDone} />
      )}
      {screen === 'quiz' && (
        <QuizScreen
          topic={topic}
          level={currentLevel}
          theoryText={theoryByLevel[currentLevel] || ''}
          askedQuestions={askedQuestionsRef.current}
          onComplete={handleLevelComplete}
        />
      )}
      {screen === 'levelup' && (
        <LevelUpScreen topic={topic} currentLevel={currentLevel} score={levelScores[currentLevel]} onDecide={handleLevelUp} />
      )}
      {screen === 'scorecard' && (
        <ScorecardScreen topic={topic} levelScores={levelScores} onRestart={handleRestart} />
      )}
    </div>
  );
}
