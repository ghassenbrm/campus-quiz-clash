// Accessibility utilities for the application

// Live region for screen reader announcements
let liveRegion = null;

/**
 * Gets or creates the live region element
 * @returns {HTMLElement} The live region element
 */
function getLiveRegion() {
  if (!liveRegion) {
    liveRegion = document.getElementById('a11y-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-live-region';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.padding = '0';
      liveRegion.style.margin = '-1px';
      liveRegion.style.overflow = 'hidden';
      liveRegion.style.clip = 'rect(0, 0, 0, 0)';
      liveRegion.style.whiteSpace = 'nowrap';
      liveRegion.style.border = '0';
      
      document.body.appendChild(liveRegion);
    }
  }
  
  return liveRegion;
}

/**
 * Announces a message to screen readers
 * @param {string} message - The message to announce
 * @param {'polite'|'assertive'|'off'} [politeness='polite'] - The politeness level
 */
export function announce(message, politeness = 'polite') {
  if (!message) return;
  
  const liveRegion = getLiveRegion();
  
  // Update politeness level if needed
  if (politeness !== 'off') {
    liveRegion.setAttribute('aria-live', politeness);
  } else {
    liveRegion.removeAttribute('aria-live');
    return; // Don't announce if turned off
  }
  
  // Clear previous announcements
  liveRegion.textContent = '';
  
  // Force a reflow for some browsers
  void liveRegion.offsetHeight;
  
  // Set the new message
  liveRegion.textContent = message;
  
  // Clear the message after a short delay to allow for repeated announcements
  if (politeness === 'assertive') {
    setTimeout(() => {
      if (liveRegion.textContent === message) {
        liveRegion.textContent = '';
      }
    }, 1000);
  }
}

/**
 * Focuses on the first focusable element within a container
 * @param {HTMLElement} container - The container element to search within
 * @param {string} [selector] - Optional custom selector for focusable elements
 * @returns {HTMLElement|null} The focused element or null if none found
 */
export function focusFirstFocusable(container, selector) {
  if (!container) return null;
  
  const focusableSelector = selector || 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  
  const focusableElements = container.querySelectorAll(focusableSelector);
  const firstFocusable = focusableElements[0];
  
  if (firstFocusable) {
    firstFocusable.focus();
    return firstFocusable;
  }
  
  return null;
}

/**
 * Focus trap for modals and dialogs
 * @param {HTMLElement} element - The container element to trap focus within
 * @returns {Function} Cleanup function to remove event listeners
 */
export function createFocusTrap(element) {
  if (!element) return () => {};

  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const firstFocusableElement = element.querySelectorAll(focusableElements)[0];
  const focusableContent = element.querySelectorAll(focusableElements);
  const lastFocusableElement = focusableContent[focusableContent.length - 1];

  // Focus first element
  firstFocusableElement?.focus();

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        e.preventDefault();
        lastFocusableElement.focus();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        e.preventDefault();
        firstFocusableElement.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Generates a unique ID for ARIA attributes
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} A unique ID
 */
let idCounter = 0;
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}-${idCounter++}`;
}

/**
 * Handles keyboard navigation for custom components
 * @param {KeyboardEvent} e - The keyboard event
 * @param {Object} options - Navigation options
 * @param {HTMLElement} options.currentElement - The currently focused element
 * @param {string} options.selector - Selector for focusable elements
 * @param {boolean} [options.horizontal=true] - Whether to navigate horizontally
 * @param {boolean} [options.vertical=false] - Whether to navigate vertically
 * @param {boolean} [options.loop=true] - Whether to loop navigation
 * @returns {boolean} Whether the navigation was handled
 */
export function handleArrowNavigation(
  e,
  { currentElement, selector, horizontal = true, vertical = false, loop = true }
) {
  if (!currentElement || !selector) return false;

  const key = e.key;
  const isHorizontal = (key === 'ArrowLeft' || key === 'ArrowRight') && horizontal;
  const isVertical = (key === 'ArrowUp' || key === 'ArrowDown') && vertical;

  if (!isHorizontal && !isVertical) return false;

  e.preventDefault();
  e.stopPropagation();

  const parent = currentElement.closest(selector)?.parentElement;
  if (!parent) return false;

  const focusableElements = Array.from(parent.querySelectorAll(selector));
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return false;

  let nextIndex = currentIndex;
  const totalItems = focusableElements.length;

  if (isHorizontal) {
    nextIndex = key === 'ArrowLeft' ? currentIndex - 1 : currentIndex + 1;
  } else if (isVertical) {
    nextIndex = key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
  }

  if (loop) {
    nextIndex = (nextIndex + totalItems) % totalItems;
  } else {
    nextIndex = Math.max(0, Math.min(nextIndex, totalItems - 1));
  }

  const nextElement = focusableElements[nextIndex];
  if (nextElement) {
    nextElement.focus();
    return true;
  }

  return false;
}

/**
 * Makes an element focusable and manages its tabindex
 * @param {HTMLElement} element - The element to make focusable
 * @param {boolean} [focusable=true] - Whether to make the element focusable
 * @returns {Function} Cleanup function to restore original state
 */
export function manageFocus(element, focusable = true) {
  if (!element) return () => {};
  
  const originalTabIndex = element.getAttribute('tabindex');
  const originalRole = element.getAttribute('role');
  
  if (focusable) {
    element.setAttribute('tabindex', '0');
    if (!element.getAttribute('role')) {
      element.setAttribute('role', 'button');
    }
  } else {
    element.setAttribute('tabindex', '-1');
  }
  
  return () => {
    if (originalTabIndex !== null) {
      element.setAttribute('tabindex', originalTabIndex);
    } else {
      element.removeAttribute('tabindex');
    }
    
    if (originalRole !== null) {
      element.setAttribute('role', originalRole);
    } else {
      element.removeAttribute('role');
    }
  };
}

/**
 * Handles click events that should also be triggered with keyboard
 * @param {KeyboardEvent} e - The keyboard event
 * @param {Function} callback - The function to call on activation
 * @param {string[]} [keys=['Enter', ' ']] - The keys that should trigger the callback
 */
export function handleActivate(
  e,
  callback,
  keys = ['Enter', ' ']
) {
  if (keys.includes(e.key)) {
    e.preventDefault();
    e.stopPropagation();
    callback(e);
  }
}
