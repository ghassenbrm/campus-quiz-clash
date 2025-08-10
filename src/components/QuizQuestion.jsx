import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { announce } from '../utils/a11y';

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onComplete,
  onTimeUp,
  timeLimit = 15,
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef(null);
  const questionRef = useRef(null);
  const navigate = useNavigate();

  // Focus management for accessibility
  useEffect(() => {
    if (questionRef.current) {
      questionRef.current.focus();
    }
    
    // Announce the question for screen readers
    announce(`Question ${questionNumber} of ${totalQuestions}: ${question.text}`);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [question, questionNumber, totalQuestions]);

  // Timer effect
  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelectedAnswer(null);
    setShowFeedback(false);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
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
  }, [question, timeLimit]);

  const handleAnswer = (answerIndex) => {
    if (showFeedback) return;
    
    clearInterval(timerRef.current);
    const correct = answerIndex === question.answer;
    setSelectedAnswer(answerIndex);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Announce the result
    const result = correct 
      ? 'Correct! ' + question.choices[answerIndex]
      : `Incorrect. The correct answer is: ${question.choices[question.answer]}`;
    
    announce(result);
    
    // Move to next question after delay
    setTimeout(() => {
      if (onAnswer) {
        onAnswer({
          questionId: question.id,
          selected: answerIndex,
          correct,
          timeSpent: timeLimit - timeLeft
        });
      }
    }, 2000);
  };

  const handleTimeUp = () => {
    if (showFeedback) return;
    
    setShowFeedback(true);
    announce('Time\'s up!');
    
    if (onTimeUp) {
      onTimeUp({
        questionId: question.id,
        selected: null,
        correct: false,
        timeSpent: timeLimit
      });
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAnswer(index);
    }
  };

  return (
    <div 
      className="quiz-question"
      role="region"
      aria-labelledby="question-prompt"
      ref={questionRef}
      tabIndex="-1"
    >
      <div className="quiz-header">
        <h2 id="question-prompt">
          Question {questionNumber} of {totalQuestions}
        </h2>
        <div 
          className="timer" 
          role="timer" 
          aria-live="assertive"
          aria-atomic="true"
        >
          Time: {timeLeft}s
        </div>
      </div>
      
      <div className="question-content">
        <p className="question-text">{question.text}</p>
        
        <div 
          className="answer-options" 
          role="radiogroup"
          aria-labelledby="question-prompt"
        >
          {question.choices.map((choice, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.answer;
            let className = 'answer-option';
            
            if (showFeedback) {
              if (isCorrectAnswer) {
                className += ' correct';
              } else if (isSelected && !isCorrect) {
                className += ' incorrect';
              }
            } else if (isSelected) {
              className += ' selected';
            }
            
            return (
              <div
                key={index}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Option ${index + 1}: ${choice} ${showFeedback && isCorrectAnswer ? '(Correct Answer)' : ''}`}
                className={className}
                onClick={() => handleAnswer(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={showFeedback ? -1 : 0}
              >
                <span className="option-number" aria-hidden="true">
                  {index + 1}.
                </span>
                <span className="option-text">{choice}</span>
                {showFeedback && isCorrectAnswer && (
                  <span className="sr-only"> (Correct Answer)</span>
                )}
              </div>
            );
          })}
        </div>
        
        {showFeedback && (
          <div 
            className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}
            role="status"
            aria-live="polite"
          >
            {isCorrect ? (
              <p>Correct! Well done!</p>
            ) : (
              <p>
                Incorrect. The correct answer is: <strong>{question.choices[question.answer]}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
