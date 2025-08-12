import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { Helmet } from "react-helmet-async";
import { FaBars, FaTimes, FaHome, FaTrophy, FaUser, FaSignInAlt, FaBook, FaBookOpen, FaBell, FaUserShield } from 'react-icons/fa';
import { auth, db } from './firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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

function ResponsiveNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  // Fetch notification count and admin status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          // Fetch notification count
          const today = new Date().toISOString().slice(0, 10);
          const snap = await getDocs(collection(db, "notifications"));
          const unread = snap.docs.filter(doc => (doc.data().date === today));
          setNotifCount(unread.length);

          // Check admin status
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().role === "admin");
          }
        }
      } catch (error) {
        console.error("Error fetching navigation data:", error);
      }
    };

    fetchData();
  }, [location.pathname]); // Re-fetch when route changes
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Don't show nav on auth pages
  if (['/login', '/signup', '/onboarding'].includes(location.pathname)) {
    return null;
  }
  
  return (
    <nav 
      ref={navRef}
      className="main-nav"
      aria-label="Main navigation"
    >
      <div className="nav-container">
        <Link to="/" className="logo" aria-label="Home">
          QuizClash
        </Link>
        
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-controls="main-menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        
        <div 
          id="main-menu" 
          className={`nav-links ${isMenuOpen ? 'show' : ''}`}
        >
          <NavLink to="/" icon={<FaHome />} text="Home" />
          <NavLink to="/quiz" icon={<FaBook />} text="Quiz" />
          <NavLink to="/practice" icon={<FaBookOpen />} text="Practice" />
          <NavLink to="/leaderboard" icon={<FaTrophy />} text="Leaderboard" />
          <NavLink to="/profile" icon={<FaUser />} text="Profile" />
          <div className="nav-actions">
            <NavLink 
              to="/notifications" 
              icon={<FaBell />} 
              text="Notifications" 
              className="nav-icon-button" 
              badgeCount={notifCount}
            />
            {isAdmin && (
              <NavLink 
                to="/admin" 
                icon={<FaUserShield />} 
                text="Admin" 
                className="nav-icon-button"
              />
            )}
            <NavLink 
              to="/login" 
              icon={<FaSignInAlt />} 
              text="Signout" 
              className="nav-login-button"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, text, className = '', badgeCount }) {
  return (
    <div className="nav-link-wrapper">
      <Link 
        to={to} 
        className={`nav-link ${className}`}
        aria-current={window.location.pathname === to ? 'page' : undefined}
      >
        <span className="nav-icon" aria-hidden="true">
          {icon}
          {badgeCount > 0 && (
            <span className="notification-badge">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </span>
        <span className="nav-text">{text}</span>
      </Link>
    </div>
  );
}

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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <meta name="theme-color" content="#4a90e2" />
      </Helmet>
      
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <ResponsiveNav />
      
      <main 
        id="main-content"
        ref={mainContentRef}
        tabIndex="-1"
        role="main"
        aria-live="polite"
        aria-atomic="true"
        style={{ outline: 'none' }}
        className={pathname === '/quiz' ? 'quiz-page page-container' : 'page-container'}
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
