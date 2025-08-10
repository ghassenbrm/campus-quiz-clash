import React from 'react';
import { Helmet } from "react-helmet-async";
import Quiz from '../components/Quiz';
import '../styles/quiz.css';

export default function QuizPage() {
  return (
    <div className="quiz-page">
      <Helmet>
        <title>Quiz - Campus Quiz Clash</title>
        <meta 
          name="description" 
          content="Test your knowledge with our daily quiz. Answer questions and compete with others on the leaderboard." 
        />
      </Helmet>
      
      <main className="quiz-main" id="main-content">
        <h1 className="sr-only">Daily Quiz</h1>
        <Quiz />
      </main>
      
      <footer className="quiz-footer">
        <p>
          Remember: The quiz is only available between 6 AM and 6 PM.
          <span className="sr-only"> 
            Navigating away from this page will disqualify your current attempt.
          </span>
        </p>
      </footer>
    </div>
  );
}
