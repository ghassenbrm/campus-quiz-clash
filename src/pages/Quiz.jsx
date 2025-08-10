import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { announce } from '../utils/a11y';
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
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [isQuizFailed, setIsQuizFailed] = useState(false);
  const [isQuizWindow, setIsQuizWindow] = useState(true);
  const [user, setUser] = useState(null);
  
  // Refs
  const questionRef = useRef(null);
  const timerRef = useRef(null);
  const answerStartRef = useRef(Date.now());
  const answerLogsRef = useRef([]);
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
      if (document.visibilityState === 'hidden' && !isQuizFinished) {
        setFocusLost(true);
        setIsQuizFailed(true);
        announce('Quiz failed: You navigated away from the quiz window.');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isQuizFinished]);
  
  // Refs
  const questionRef = useRef(null);
  const timerRef = useRef(null);
  const answerStartRef = useRef(Date.now());
  const [user, setUser] = useState(null);

  // Announce timer changes for screen readers
  useEffect(() => {
    if (timer <= 5 && timer > 0) {
      announce(`${timer} seconds remaining`);
    }
  }, [timer]);

  // Quiz window enforcement (6AM-6PM)
  useEffect(() => {
    const checkQuizTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const isQuizTime = hour >= 6 && hour < 18;
      
      if (!isQuizTime) {
        setQuizWindow(false);
        setLoading(false);
        setError("The quiz is only available between 6 AM and 6 PM.");
        announce("The quiz is currently closed. Please return between 6 AM and 6 PM.");
      } else {
        setQuizWindow(true);
      }
    };
    
    // Check immediately and set up interval to check every minute
    checkQuizTime();
    const interval = setInterval(checkQuizTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Anti-cheat: focus loss
  useEffect(() => {
    const onBlur = () => setFocusLost(true);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Timer for each question
  useEffect(() => {
    if (finished || !quizWindow || showAnswer) return;
    
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        // Announce time when 5 seconds or less remain
        if (prev <= 6) {
          announce(`${prev - 1} seconds remaining`);
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [finished, quizWindow, showAnswer]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    // Skip if already showing answer or quiz is finished
    if (showAnswer || finished) return;
    
    const { key } = e;
    
    // Handle number keys 1-4 for answer selection
    if (/^[1-4]$/.test(key)) {
      const answerIndex = parseInt(key, 10) - 1;
      if (answerIndex >= 0 && answerIndex < questions[current]?.choices.length) {
        handleAnswer(answerIndex);
      }
      return;
    }

    // Handle arrow keys for navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      const currentIndex = selected !== null ? selected : -1;
      let newIndex = currentIndex;
      
      if (key === 'ArrowDown' || key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % questions[current].choices.length;
      } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + questions[current].choices.length) % questions[current].choices.length;
      }
      
      setSelected(newIndex);
      
      // Focus the selected answer for better keyboard navigation
      const answerElement = document.querySelector(`[data-index="${newIndex}"]`);
      if (answerElement) {
        answerElement.focus();
      }
      return;
    }

    // Handle Enter/Space to confirm selection
    if ((key === 'Enter' || key === ' ') && selected !== null) {
      e.preventDefault();
      handleAnswer(selected);
      return;
    }
  }, [current, selected, showAnswer, finished, questions, handleAnswer]);

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle tab key press to detect keyboard users
  useEffect(() => {
    const handleFirstTab = (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
      }
    };

    window.addEventListener('keydown', handleFirstTab);
    return () => window.removeEventListener('keydown', handleFirstTab);
  }, []);

  // Load or assign daily questions
  useEffect(() => {
    if (!user) return;
    const fetchOrAssignDailyQuiz = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const quizRef = doc(db, 'user_daily_quizzes', `${user.uid}_${today}`);
      const quizSnap = await getDoc(quizRef);
      if (quizSnap.exists()) {
        setQuestions(quizSnap.data().questions || []);
        setLoading(false);
        return;
      }
      // Assign random questions
      try {
        const allSnap = await getDocs(collection(db, 'questions'));
        let allQ = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // TODO: Filter out already correctly answered questions (future)
        // Shuffle and pick 10
        allQ = allQ.sort(() => Math.random() - 0.5).slice(0, 10);
        await setDoc(quizRef, { userId: user.uid, date: today, questions: allQ, createdAt: serverTimestamp() });
        setQuestions(allQ);
      } catch (err) {
        setError('Erreur lors de l\'attribution des questions : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (quizWindow) fetchOrAssignDailyQuiz();
  }, [quizWindow, user]);

  // Save answer log
  const logAnswer = async (q, selectedIdx, correct, duration) => {
    const user = auth.currentUser;
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const quizRef = doc(db, 'user_daily_quizzes', `${user.uid}_${today}`);
    const answerRef = doc(db, `user_daily_quizzes/${user.uid}_${today}/answers`, q.id);
    const log = {
      questionId: q.id,
      selected: selectedIdx,
      correct,
      answeredAt: new Date().toISOString(),
      duration,
      text: q.text || '',
      choices: q.choices || [],
      correctAnswer: q.answer
    };
    await setDoc(answerRef, log);
    setAnswerLogs(prev => [...prev, log]);
  };

  // Save score to leaderboard when finished
  useEffect(() => {
    const saveScoreAndStats = async () => {
      const user = auth.currentUser;
      if (!user || !finished) return;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const leaderboardRef = doc(db, "leaderboards", user.uid + "_" + today);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};

        // Update leaderboard
        await setDoc(leaderboardRef, {
          uid: user.uid,
          email: user.email,
          score,
          date: today,
          university: userData.university || "",
          classroom: userData.classroom || "",
          avatar: userData.avatar || "",
          createdAt: serverTimestamp()
        });

        // Calculate stats
        const totalAnswered = (userData.totalAnswered || 0) + questions.length;
        const totalCorrect = (userData.totalCorrect || 0) + score;
        // Streak logic
        let currentStreak = userData.currentStreak || 0;
        let bestStreak = userData.bestStreak || 0;
        let lastQuizDate = userData.lastQuizDate || null;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (lastQuizDate === yesterday) {
          currentStreak += 1;
        } else if (lastQuizDate === today) {
          // already counted today
        } else {
          currentStreak = 1;
        }
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        // Unlock avatars for streak milestones
        let unlockedAvatars = userData.unlockedAvatars || [];
        const streakMilestones = [3, 7, 14];
        streakMilestones.forEach(m => {
          if (currentStreak >= m && !unlockedAvatars.includes(`streak${m}`)) {
            unlockedAvatars.push(`streak${m}`);
          }
        });
        // Update user stats
        await updateDoc(userRef, {
          totalAnswered,
          totalCorrect,
          currentStreak,
          bestStreak,
          lastQuizDate: today,
          unlockedAvatars
        });
        setSaveMsg("Score et statistiques sauvegardés !");
      } catch (e) {
        setSaveMsg("Erreur lors de la sauvegarde du score/statistiques : " + e.message);
      }
    };
    if (finished) saveScoreAndStats();
  }, [finished]);

  if (loading) return <div role="status" aria-live="polite">Loading quiz questions...</div>;
  if (error) return <div className="error" role="alert" aria-live="assertive">{error}</div>;
  if (!quizWindow) return (
    <div role="alert" aria-live="polite">
      <h1>Quiz Unavailable</h1>
      <p>The quiz is only available between 6 AM and 6 PM.</p>
    </div>
  );
  if (questions.length === 0) return <div role="alert" aria-live="polite">No questions available.</div>;
  if (focusLost || failed) return (
    <div className="error" role="alert" aria-live="assertive">
      <h1>Quiz Failed</h1>
      <p>You've been disqualified due to leaving the quiz window or time expiration. Please try again tomorrow!</p>
    </div>
  );
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

  const q = questions[current];
  return (
    <div 
      className="quiz-container" 
      role="main"
      aria-labelledby="quiz-title"
      onKeyDown={handleKeyDown}
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
        
        {questions[current].choices.map((choice, index) => {
          const isCorrect = index === questions[current].answer;
          const isSelected = selected === index;
          let ariaLabel = choice;
          
          if (showAnswer) {
            if (isSelected && isCorrect) {
              ariaLabel += ". Correct answer.";
            } else if (isSelected) {
              ariaLabel += ". Incorrect. The correct answer is " + questions[current].choices[questions[current].answer];
            } else if (isCorrect) {
              ariaLabel += ". Correct answer.";
            }
          }
          
          return (
            <div 
              key={index}
              role="radio"
              aria-checked={isSelected}
              aria-label={ariaLabel}
              aria-disabled={showAnswer}
              className={`answer-option ${isSelected ? 'selected' : ''} ${showAnswer && isCorrect ? 'correct' : ''} ${showAnswer && isSelected && !isCorrect ? 'incorrect' : ''}`}
              onClick={() => !showAnswer && handleAnswer(index)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  if (!showAnswer) handleAnswer(index);
                }
              }}
              tabIndex={showAnswer ? -1 : 0}
              data-index={index}
            >
              <span className="option-number" aria-hidden="true">{index + 1}.</span>
              <span className="option-text">{choice}</span>
              {showAnswer && isCorrect && (
                <span className="sr-only"> (Correct Answer)</span>
              )}
              {showAnswer && isSelected && !isCorrect && (
                <span className="sr-only"> (Your Answer)</span>
              )}
            </div>
          );
        })}
      </div>
      
      {announcement && (
        <div 
          role="alertdialog" 
          aria-labelledby="quiz-finished-title" 
          aria-describedby="quiz-finished-desc"
        >
          <h2 id="quiz-finished-title">Quiz Completed!</h2>
          <p id="quiz-finished-desc">
            You scored {score} out of a possible {questions.length * 10} points.
          </p>
          <div className="quiz-actions">
            <button 
              onClick={handleSaveScore}
              className="primary-button"
            >
              Save Score
            </button>
            <button 
              onClick={() => navigate('/leaderboard')}
              className="secondary-button"
            >
              View Leaderboard
            </button>
          </div>
          {saveMsg && (
            <p className="save-message" role="status" aria-live="polite">
              {saveMsg}
            </p>
          )}
          <button
            onClick={() => {
              setTimer(15);
              answerStartRef.current = Date.now();
              if (current + 1 < questions.length) {
                setCurrent(current + 1);
                setShowAnswer(false);
                setSelected(null);
              } else {
                setFinished(true);
              }
            }}
            className="next-question-btn"
            aria-label={current + 1 < questions.length ? 'Next question' : 'View score'}
          >
            {current + 1 < questions.length ? 'Next Question' : 'View My Score'}
          </button>
        </div>
      )}
    </div>
  );
}

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
  
  // Move to next question after delay
  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent(prev => {
        const next = prev + 1;
        // Focus on the next question for screen readers
        setTimeout(() => {
          const nextQuestionElement = document.querySelector('[aria-live="police"]');
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
    } else {
      setFinished(true);
      announce(`Quiz completed! Your score is ${score + (isCorrect ? 1 : 0)} out of ${questions.length}`);
      
      // Focus on the quiz completion message
      setTimeout(() => {
        const completionElement = document.querySelector('[role="alertdialog"]');
        if (completionElement) {
          completionElement.focus();
        }
      }, 100);
    }
  };
  
  const timeoutId = setTimeout(nextQuestion, 3000);
  return () => clearTimeout(timeoutId);
}, [current, questions, score, showAnswer]);
