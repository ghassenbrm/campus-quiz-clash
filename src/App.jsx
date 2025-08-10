import React, { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import Home from './pages/Home';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import QuizPage from './pages/QuizPage';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Practice from './pages/Practice';
import { createFocusTrap, announce } from './utils/a11y';
import './styles/global.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  const mainContentRef = useRef(null);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Focus the main content area for screen readers
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
    
    // Announce page change for screen readers
    const pageTitle = document.querySelector('h1')?.textContent || 'Page';
    announce(`Loaded ${pageTitle}`);
    
  }, [pathname]);

  return (
    <>
      <Helmet>
        <html lang="en" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#4a90e2" />
      </Helmet>
      
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <main 
        id="main-content"
        ref={mainContentRef}
        tabIndex="-1"
        role="main"
        aria-live="polite"
        aria-atomic="true"
        style={{ outline: 'none' }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/practice" element={<Practice />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const appRef = useRef(null);
  const location = useLocation();

  // Set up focus trap for modals when they're open
  useEffect(() => {
    let cleanup = () => {};
    
    // If there's a modal open, trap focus within it
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      cleanup = createFocusTrap(modal);
    }
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [location]);

  return (
    <div 
      ref={appRef}
      role="application"
      aria-label="Campus Quiz Clash Application"
      className={location.pathname === '/quiz' ? 'quiz-active' : ''}
    >
      <ScrollToTop />
    </div>
  );
}
