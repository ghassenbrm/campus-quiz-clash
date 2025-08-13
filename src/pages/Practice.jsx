import React, { useState, useEffect } from "react";
import { FaBook, FaRobot, FaTrophy, FaArrowRight, FaRedo, FaHome, FaCheck, FaTimes } from 'react-icons/fa';
import { fetchQuestions } from "../utils/questions/triviaService";
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
      // Fetch 30 random questions from all categories
      const allQuestions = [];
      
      // Get questions from all available categories
      const categories = [
        'general', 'science', 'history', 'geography', 'sports',
        'movies', 'music', 'television', 'video-games', 'animals',
        'literature', 'entertainment'
      ];
      
      // Fetch questions from each category and combine them
      for (const category of categories) {
        try {
          const categoryQuestions = await fetchQuestions(category, 30);
          // Ensure each question has the required fields
          const formattedQuestions = categoryQuestions.map(q => ({
            id: q.id || Math.random().toString(36).substr(2, 9),
            text: q.question || q.text || 'No question text',
            choices: q.choices || q.options || [],
            answer: q.answer,
            explanation: q.explanation || null,
            category: q.category || category
          }));
          allQuestions.push(...formattedQuestions);
        } catch (err) {
          console.error(`Error loading questions for category ${category}:`, err);
        }
      }
      
      // Shuffle all questions and take the first 30
      const shuffled = allQuestions
        .filter(q => q.choices && q.choices.length > 0) // Only keep questions with choices
        .sort(() => 0.5 - Math.random())
        .slice(0, 30);
      
      if (shuffled.length === 0) {
        throw new Error("No valid questions were loaded. Please try again.");
      }
      
      setQuestions(shuffled);
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      setShowExplanation(null);
    } catch (error) {
      console.error("Error loading questions:", error);
      alert(error.message || "An error occurred while loading questions. Please try again.");
      resetQuiz();
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (choiceIndex) => {
    if (selected !== null) return; // Prevent multiple selections
    
    try {
      setSelected(choiceIndex);
      const currentQuestion = questions[current];
      
      // Validate question data
      if (!currentQuestion || !Array.isArray(currentQuestion.choices) || 
          currentQuestion.choices.length === 0 || 
          choiceIndex === undefined || 
          choiceIndex < 0 || 
          choiceIndex >= currentQuestion.choices.length) {
        console.error('Invalid question or choice data:', { currentQuestion, choiceIndex });
        // Skip to next question if current one is invalid
        moveToNextQuestion();
        return;
      }
      
      // Get the selected choice
      const selectedChoice = String(currentQuestion.choices[choiceIndex] || '').trim().toLowerCase();
      
      // Determine correct answer - handle both numeric index and direct answer text
      let correctAnswerText = '';
      if (typeof currentQuestion.answer === 'number' && 
          currentQuestion.answer >= 0 && 
          currentQuestion.answer < currentQuestion.choices.length) {
        correctAnswerText = String(currentQuestion.choices[currentQuestion.answer] || '').trim().toLowerCase();
      } else if (currentQuestion.answer !== undefined) {
        correctAnswerText = String(currentQuestion.answer).trim().toLowerCase();
      } else {
        // If answer is undefined, treat it as a wrong answer
        console.warn('Question has no defined answer:', currentQuestion);
        setScore(score); // Keep score the same
        moveToNextQuestion();
        return;
      }
      
      const isCorrect = selectedChoice === correctAnswerText;
      
      console.log('Selected:', selectedChoice);
      console.log('Correct answer:', correctAnswerText);
      console.log('Is correct?', isCorrect);
      
      if (isCorrect) {
        setScore(score + 1);
      }
      
      // Show explanation if available
      if (currentQuestion.explanation) {
        setShowExplanation(currentQuestion.explanation);
      }
      
      // Move to next question after a delay
      const nextQuestionTimer = setTimeout(moveToNextQuestion, 1500);
      
      // Clean up timer if component unmounts
      return () => clearTimeout(nextQuestionTimer);
      
    } catch (error) {
      console.error('Error handling answer selection:', error);
      // Move to next question on error to prevent getting stuck
      moveToNextQuestion();
    }
    
    function moveToNextQuestion() {
      if (current < questions.length - 1) {
        setCurrent(prevCurrent => {
          const nextCurrent = prevCurrent + 1;
          // Skip any questions that don't have valid choices
          while (nextCurrent < questions.length - 1 && 
                (!questions[nextCurrent]?.choices || 
                 !Array.isArray(questions[nextCurrent].choices) || 
                 questions[nextCurrent].choices.length === 0)) {
            nextCurrent++;
          }
          return nextCurrent;
        });
        setSelected(null);
        setShowExplanation(null);
      } else {
        setFinished(true);
      }
    }
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
