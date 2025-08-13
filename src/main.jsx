import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { announce } from './utils/a11y';
import './index.css';
import './styles/a11y.css';
import './styles/global.css';
import './styles/multiplayer.css';
import App from './App.jsx';

// Add skip to main content link
const skipLink = document.createElement('a');
skipLink.href = '#main-content';
skipLink.className = 'skip-to-content';
skipLink.textContent = 'Skip to main content';
document.body.prepend(skipLink);

// Handle focus for accessibility
const handleFirstTab = (e) => {
  if (e.key === 'Tab') {
    document.body.classList.add('user-is-tabbing');
    window.removeEventListener('keydown', handleFirstTab);
  }
};

window.addEventListener('keydown', handleFirstTab);

// Announce page changes for screen readers
const handleRouteChange = () => {
  const mainHeading = document.querySelector('h1');
  if (mainHeading) {
    announce(`Navigated to ${mainHeading.textContent}`);
  }
};

// Create root and render app
const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <HelmetProvider>
      <Router onUpdate={handleRouteChange}>
        <App />
      </Router>
    </HelmetProvider>
  </StrictMode>
);

// Set document language
if (document.documentElement.lang === '') {
  document.documentElement.lang = 'en';
}

// Set page title
const updateTitle = () => {
  const path = window.location.pathname;
  let pageTitle = 'Campus Quiz Clash';
  
  if (path.includes('quiz')) pageTitle = 'Quiz - ' + pageTitle;
  else if (path.includes('leaderboard')) pageTitle = 'Leaderboard - ' + pageTitle;
  else if (path.includes('profile')) pageTitle = 'Profile - ' + pageTitle;
  else if (path.includes('admin')) pageTitle = 'Admin - ' + pageTitle;
  
  document.title = pageTitle;
};

// Initial title set
updateTitle();

// Listen for route changes
window.addEventListener('popstate', updateTitle);
