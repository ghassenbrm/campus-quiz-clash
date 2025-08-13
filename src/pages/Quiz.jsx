import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { announce } from '../utils/a11y';
import { fetchQuestions } from '../utils/questions/triviaService';
import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';

// Constants
const TIME_PER_QUESTION = 15; // seconds
const QUIZ_HOURS = { start: 6, end: 18 }; // 6 AM to 6 PM

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [saveMsg, setSaveMsg] = useState('');
  const [finished, setFinished] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [answerLogs, setAnswerLogs] = useState([]);
  const [error, setError] = useState('');
  const [isQuizWindow, setIsQuizWindow] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState([]);
  
  // Refs
  const questionRef = useRef(null);
  const timerRef = useRef(null);
  const answerStartRef = useRef(Date.now());
  const answerLogsRef = useRef([]);
  
  // Load questions and initialize quiz
  const initializeQuiz = useCallback(async () => {
    try {
      const category = location.state?.category || 'general';
      const fetchedQuestions = await fetchQuestions(category, 10); // Get 10 questions
      setQuestions(fetchedQuestions);
      setUserAnswers(Array(fetchedQuestions.length).fill(null));
      setLoading(false);
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Failed to load quiz questions. Please try again later.');
      setLoading(false);
    }
  }, [location.state?.category]);

  // Auth check and user state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setError('Please log in to take the quiz.');
        setLoading(false);
        navigate('/login', { state: { from: '/quiz' } });
      } else {
        setUser(user);
        // Initialize quiz after user is set
        initializeQuiz();
      }
    });
    
    return () => {
      unsubscribe();
      // Cleanup timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [navigate, initializeQuiz]);
  
  // Check if current time is within quiz window (6 AM - 6 PM)
  useEffect(() => {
    const checkQuizTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const isWithinWindow = currentHour >= QUIZ_HOURS.start && currentHour < QUIZ_HOURS.end;
      
      if (!isWithinWindow) {
        setIsQuizWindow(false);
        setError('The quiz is only available between 6 AM and 6 PM.');
        announce('The quiz is currently closed. Please return between 6 AM and 6 PM.');
      }
    };
    
    // Check immediately and set up interval to check every minute
    checkQuizTime();
    const interval = setInterval(checkQuizTime, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Detect if user navigates away from the quiz
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !finished) {
        setError('Quiz failed: You navigated away from the quiz window.');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [finished]);
  
  // Handle quiz submission
  const handleSubmitQuiz = useCallback(() => {
    if (current === questions.length - 1) {
      setFinished(true);
      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [current, questions.length]);

  // Handle answer selection
  const handleAnswer = useCallback((index) => {
    if (showAnswer || index === null) return;
    
    const timeSpent = Math.floor((Date.now() - answerStartRef.current) / 1000);
    const currentQuestion = questions[current];
    const isCorrect = index === currentQuestion.answer;
    
    // Update UI state
    setSelected(index);
    setShowAnswer(true);
    
    // Create announcement for screen readers
    const resultAnnouncement = isCorrect 
      ? `Correct! ${currentQuestion.choices[index]}`
      : `Incorrect. The correct answer is: ${currentQuestion.choices[currentQuestion.answer]}`;
    
    setAnnouncement(resultAnnouncement);
    announce(resultAnnouncement);
    
    // Calculate and update score
    if (isCorrect) {
      const points = Math.max(1, 10 - Math.floor(timeSpent / 3));
      setScore(prev => prev + points);
      setSaveMsg(`Correct! +${points} points`);
    } else {
      setSaveMsg("Incorrect!");
    }
    
    // Log the answer
    setAnswerLogs(prev => [...prev, {
      questionId: currentQuestion.id,
      selected: index,
      correct: isCorrect,
      timeSpent
    }]);
    
    // Update user answers
    const newUserAnswers = [...userAnswers];
    newUserAnswers[current] = index;
    setUserAnswers(newUserAnswers);
    
    // Don't auto-advance on last question - wait for submit
    if (current < questions.length - 1) {
      // Auto-advance to next question after delay
      const timeoutId = setTimeout(() => {
        setCurrent(prev => {
          const next = prev + 1;
          // Focus on the next question for screen readers
          setTimeout(() => {
            const nextQuestionElement = document.querySelector('[aria-live="polite"]');
            if (nextQuestionElement) {
              nextQuestionElement.focus();
            }
            
            // Announce the next question
            const nextQ = questions[next];
            if (nextQ) {
              announce(`Question ${next + 1} of ${questions.length}: ${nextQ.text}`);
            }
          }, 100);
          
          return next;
        });
        
        setSelected(null);
        setShowAnswer(false);
        answerStartRef.current = Date.now();
        setTimer(15);
        setSaveMsg("");
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [current, questions, showAnswer, userAnswers]);

  // Show loading state
  if (loading) {
    return (
      <div className="quiz-container">
        <div className="loading">Loading quiz...</div>
      </div>
    );
  }

  // Render the quiz or results
  if (finished) {
    return (
      <div style={{margin: 40}}>
        <h1>Quiz terminé !</h1>
        <div style={{fontSize: 20, margin: 24}}>
          Score : <b>{score} / {questions.length}</b>
        </div>
        <div style={{color: '#006600', marginBottom: 16}}>{saveMsg}</div>
        <button onClick={() => window.location.reload()} style={{padding: 10, fontSize: 16}}>Rejouer</button>
        <div style={{marginTop: 24}}>
          <h3>Journal des réponses :</h3>
          <ul>
            {answerLogs.map((log, idx) => (
              <li key={idx}>
                Q{idx+1}: {log.text} | Réponse: {log.selected !== null ? log.choices[log.selected] : 'Non répondu'} | {log.correct ? '✔️' : '❌'} | {log.duration}s
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return <div role="alert" aria-live="polite">No questions available.</div>;
  if (error) return <div className="error" role="alert" aria-live="assertive">{error}</div>;
  if (!isQuizWindow) return (
    <div role="alert" aria-live="polite">
      <h1>Quiz Unavailable</h1>
      <p>The quiz is only available between 6 AM and 6 PM.</p>
    </div>
  );

  const q = questions[current];
  return (
    <div 
      className="quiz-container" 
      role="main"
      aria-labelledby="quiz-title"
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const currentIndex = selected !== null ? selected : -1;
          let newIndex = currentIndex;
          
          if (e.key === 'ArrowDown') {
            newIndex = (currentIndex + 1) % questions[current].choices.length;
          } else if (e.key === 'ArrowUp') {
            newIndex = (currentIndex - 1 + questions[current].choices.length) % questions[current].choices.length;
          }
          
          setSelected(newIndex);
          
          // Focus the selected answer for better keyboard navigation
          const answerElement = document.querySelector(`[data-index="${newIndex}"]`);
          if (answerElement) {
            answerElement.focus();
          }
        }
      }}
    >
      <div className="quiz-header">
        <h1 id="quiz-title">Quiz</h1>
        <div className="quiz-meta">
          <div className="question-counter" aria-live="polite">
            Question {current + 1} of {questions.length}
          </div>
          <div className="timer" role="timer" aria-live="assertive">
            Time remaining: {timer} seconds
          </div>
          <div className="score" aria-live="polite">
            Score: {score} points
          </div>
        </div>
      </div>
      
      <div 
        ref={questionRef}
        className="question"
        tabIndex="-1"
        aria-live="polite"
      >
        <h2>{questions[current].text}</h2>
      </div>
      
      <div 
        className="answers" 
        role="radiogroup" 
        aria-label="Answer choices"
        aria-describedby="answer-instructions"
      >
        <p id="answer-instructions" className="sr-only">
          Use number keys 1-4 or arrow keys to select an answer. Press Enter or Space to confirm your selection.
        </p>
        
        {questions[current].choices.map((choice, index) => (
          <button
            key={index}
            className={`option-btn ${showAnswer ? (index === questions[current].answer ? 'correct' : '') : ''} ${selected === index ? 'selected' : ''}`}
            onClick={() => handleAnswer(index)}
            disabled={showAnswer}
          >
            {choice}
          </button>
        ))}
        
        {/* Submit button (only shown on last question) */}
        {current === questions.length - 1 && (
          <button 
            className={`submit-quiz-btn ${!showAnswer ? 'disabled' : ''}`}
            onClick={handleSubmitQuiz}
            disabled={!showAnswer}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
