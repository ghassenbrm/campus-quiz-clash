import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { announce } from '../utils/a11y';
import QuizQuestion from './QuizQuestion';

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizWindow, setQuizWindow] = useState(true);
  const [focusLost, setFocusLost] = useState(false);
  const [answerLogs, setAnswerLogs] = useState([]);
  const [user, setUser] = useState(null);

  // Auth check and user state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setError('Please log in to take the quiz.');
        setLoading(false);
        navigate('/login', { state: { from: '/quiz' } });
      } else {
        setUser(user);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Quiz window enforcement (6AM-6PM)
  useEffect(() => {
    const checkQuizTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const isQuizTime = hour >= 6 && hour < 18;
      
      if (!isQuizTime) {
        setQuizWindow(false);
        setError('The quiz is only available between 6 AM and 6 PM.');
        announce('The quiz is currently closed. Please return between 6 AM and 6 PM.');
      } else {
        setQuizWindow(true);
      }
    };
    
    checkQuizTime();
    const interval = setInterval(checkQuizTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Anti-cheat: Detect focus loss
  useEffect(() => {
    const onBlur = () => setFocusLost(true);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Load or assign daily questions
  useEffect(() => {
    if (!user || !quizWindow) return;
    
    const fetchOrAssignDailyQuiz = async () => {
      try {
        setLoading(true);
        
        // Check if user already has questions assigned for today
        const today = new Date().toISOString().split('T')[0];
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().lastQuizDate === today) {
          // User already took quiz today
          setQuestions(userDoc.data().dailyQuestions || []);
        } else {
          // Assign new questions
          const questionsRef = collection(db, 'questions');
          const snapshot = await getDocs(questionsRef);
          const allQuestions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Select random questions (e.g., 10 questions)
          const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
          const selectedQuestions = shuffled.slice(0, 10);
          
          // Save to user's document
          await updateDoc(userDocRef, {
            dailyQuestions: selectedQuestions,
            lastQuizDate: today
          });
          
          setQuestions(selectedQuestions);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to load quiz questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrAssignDailyQuiz();
  }, [user, quizWindow]);

  // Handle answer submission
  const handleAnswer = useCallback(async (result) => {
    const { correct, timeSpent } = result;
    
    // Update score if answer is correct
    if (correct) {
      const points = Math.max(1, 10 - Math.floor(timeSpent / 3));
      setScore(prev => prev + points);
    }
    
    // Log the answer
    setAnswerLogs(prev => [...prev, result]);
    
    // Move to next question or finish quiz
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      await saveResults();
    }
  }, [currentQuestionIndex, questions.length]);

  // Save results to Firestore
  const saveResults = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      
      // Get user data
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      
      // Calculate stats
      const totalQuestions = questions.length;
      const correctAnswers = answerLogs.filter(log => log.correct).length;
      const accuracy = Math.round((correctAnswers / totalQuestions) * 100) || 0;
      
      // Update leaderboard
      await setDoc(leaderboardRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Anonymous',
        score,
        accuracy,
        lastUpdated: serverTimestamp(),
        totalQuizzes: (userData.totalQuizzes || 0) + 1
      }, { merge: true });
      
      // Update user stats
      await updateDoc(userRef, {
        totalQuestions: (userData.totalQuestions || 0) + totalQuestions,
        correctAnswers: (userData.correctAnswers || 0) + correctAnswers,
        totalScore: (userData.totalScore || 0) + score,
        lastQuizDate: new Date().toISOString().split('T')[0],
        totalQuizzes: (userData.totalQuizzes || 0) + 1,
        averageScore: Math.round((((userData.totalScore || 0) + score) / 
          ((userData.totalQuizzes || 0) + 1)) * 100) / 100
      });
      
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Failed to save your results. Your score may not have been recorded.');
    }
  };

  // Handle time up for a question
  const handleTimeUp = useCallback(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const result = {
      questionId: currentQuestion.id,
      selected: null,
      correct: false,
      timeSpent: 15 // Default time limit
    };
    
    setAnswerLogs(prev => [...prev, result]);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      saveResults();
    }
  }, [currentQuestionIndex, questions]);

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        <p>Loading quiz questions...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="error-container" role="alert" aria-live="assertive">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // Render quiz window closed message
  if (!quizWindow) {
    return (
      <div className="quiz-closed" role="alert" aria-live="polite">
        <h2>Quiz Unavailable</h2>
        <p>The quiz is only available between 6 AM and 6 PM.</p>
        <p>Please come back during the quiz hours to participate.</p>
      </div>
    );
  }

  // Render focus lost message
  if (focusLost) {
    return (
      <div className="quiz-failed" role="alert" aria-live="assertive">
        <h2>Quiz Disqualified</h2>
        <p>You navigated away from the quiz window.</p>
        <p>Please try again tomorrow.</p>
      </div>
    );
  }

  // Render quiz completion
  if (currentQuestionIndex >= questions.length) {
    const correctAnswers = answerLogs.filter(log => log.correct).length;
    const accuracy = Math.round((correctAnswers / questions.length) * 100) || 0;
    
    return (
      <div className="quiz-completed" role="alertdialog" aria-labelledby="quiz-completed-title">
        <h2 id="quiz-completed-title">Quiz Completed!</h2>
        <div className="quiz-results">
          <p>Your score: <strong>{score} points</strong></p>
          <p>Correct answers: {correctAnswers} out of {questions.length}</p>
          <p>Accuracy: {accuracy}%</p>
        </div>
        <div className="quiz-actions">
          <button 
            onClick={() => navigate('/leaderboard')}
            className="btn btn-primary"
          >
            View Leaderboard
          </button>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Render current question
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="quiz-container">
      <QuizQuestion
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onAnswer={handleAnswer}
        onTimeUp={handleTimeUp}
        timeLimit={15}
      />
      
      <div className="quiz-progress">
        <p>
          Question {currentQuestionIndex + 1} of {questions.length}
          <span className="score">Score: {score}</span>
        </p>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{
              width: `${((currentQuestionIndex) / questions.length) * 100}%`
            }}
            aria-valuenow={currentQuestionIndex}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            role="progressbar"
          ></div>
        </div>
      </div>
    </div>
  );
}
