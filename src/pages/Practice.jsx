import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FaBook, FaRobot, FaTrophy, FaArrowRight, FaRedo, FaHome, FaCheck, FaTimes } from 'react-icons/fa';
import "./../styles/practice.css";

const Practice = () => {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [showExplanation, setShowExplanation] = useState(null);

  const startPractice = async (ai = false) => {
    setLoading(true);
    setAiMode(ai);
    try {
      const snap = await getDocs(collection(db, "questions"));
      const arr = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // For AI mode, we could add filtering or different logic here
      const shuffled = arr.sort(() => 0.5 - Math.random()).slice(0, 10);
      setQuestions(shuffled);
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      setShowExplanation(null);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (choiceIndex) => {
    if (selected !== null) return; // Prevent multiple selections
    
    setSelected(choiceIndex);
    const isCorrect = questions[current].answer === choiceIndex;
    
    if (isCorrect) {
      setScore(score + 1);
    }
    
    // Show explanation if available
    if (questions[current].explanation) {
      setShowExplanation(questions[current].explanation);
    }
    
    // Move to next question after a delay
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent(current + 1);
        setSelected(null);
        setShowExplanation(null);
      } else {
        setFinished(true);
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setShowExplanation(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Chargement du quiz...</p>
      </div>
    );
  }

  // Render mode selection
  if (questions.length === 0) {
    return (
      <div className="practice-container">
        <div className="practice-header">
          <h1 className="practice-title">Mode Pratique</h1>
          <p className="practice-subtitle">
            Testez vos connaissances et améliorez vos compétences avec nos quiz interactifs.
            Choisissez un mode pour commencer.
          </p>
        </div>
        
        <div className="mode-selector">
          <div className="mode-card" onClick={() => startPractice(false)}>
            <h3><FaBook /> Quiz Classique</h3>
            <p>Testez vos connaissances avec une sélection aléatoire de questions.</p>
            <button className="button primary-button">Commencer <FaArrowRight /></button>
          </div>
          
          <div className="mode-card" onClick={() => startPractice(true)}>
            <h3><FaRobot /> Quiz IA <span className="mode-badge">Bientôt</span></h3>
            <p>Un quiz intelligent qui s'adapte à votre niveau (disponible prochainement).</p>
            <button className="button secondary-button" disabled>Bientôt disponible</button>
          </div>
        </div>
      </div>
    );
  }

  // Render results
  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="practice-container">
        <div className="results-container">
          <h1 className="results-title">Résultats du Quiz</h1>
          
          <div className="results-score">
            <FaTrophy /> {score} <span style={{ fontSize: '1.5rem', color: '#4a5568' }}>/ {questions.length}</span>
          </div>
          
          <div style={{ 
            width: '100%', 
            height: '10px', 
            background: '#e2e8f0', 
            borderRadius: '5px',
            margin: '1.5rem 0',
            overflow: 'hidden'
          }}>
            <div 
              style={{ 
                width: `${percentage}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                transition: 'width 0.5s ease'
              }}
            ></div>
          </div>
          
          <p style={{ color: '#4a5568', marginBottom: '2rem' }}>
            Vous avez répondu correctement à {score} questions sur {questions.length}.
            {percentage >= 70 ? ' Excellent travail !' : ' Continuez à vous entraîner !'}
          </p>
          
          <div className="results-actions">
            <button 
              className="button primary-button" 
              onClick={resetQuiz}
            >
              <FaRedo /> Nouveau quiz
            </button>
            <button 
              className="button secondary-button"
              onClick={() => window.location.href = '/'}
            >
              <FaHome /> Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render current question
  const question = questions[current];
  
  return (
    <div className="practice-container">
      <div className="quiz-container">
        <div className="quiz-header">
          <h2 className="quiz-title">
            {aiMode ? 'Quiz IA' : 'Quiz Classique'}
          </h2>
          <div className="quiz-progress">
            Question {current + 1} / {questions.length}
          </div>
        </div>
        
        <div className="quiz-question">
          <p>{question.text}</p>
        </div>
        
        <div className="quiz-options">
          {question.choices.map((choice, index) => {
            const isSelected = selected === index;
            const isCorrect = question.answer === index;
            const showCorrect = selected !== null && isCorrect;
            const showIncorrect = isSelected && !isCorrect;
            
            return (
              <button
                key={index}
                className={`option-button ${
                  showCorrect ? 'correct' : showIncorrect ? 'incorrect' : ''
                }`}
                onClick={() => handleSelect(index)}
                disabled={selected !== null}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>{choice}</span>
                  {showCorrect && <FaCheck style={{ color: '#166534' }} />}
                  {showIncorrect && <FaTimes style={{ color: '#991b1b' }} />}
                </div>
              </button>
            );
          })}
        </div>
        
        {showExplanation && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            borderLeft: '4px solid #4f46e5',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <strong>Explication :</strong> {showExplanation}
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
