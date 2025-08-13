/**
 * Parser for OpenTriviaQA text format
 * Format:
 * #Q Question text
 * ^ Correct answer
 * A Option A
 * B Option B
 * ...
 */

const fs = require('fs');
const path = require('path');

// Cache for parsed questions
const questionCache = new Map();

/**
 * Parse a single question block
 */
function parseQuestionBlock(block) {
  const lines = block.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 3) return null; // Not a valid question block

  const question = lines[0].replace(/^#Q\s*/, '').trim();
  const correctAnswer = lines[1].replace(/^\^\s*/, '').trim();
  
  const options = [];
  let correctIndex = -1;
  
  // Process options (lines starting with A, B, C, etc.)
  for (let i = 2; i < lines.length; i++) {
    const match = lines[i].match(/^([A-Z])\s+(.+)$/);
    if (match) {
      const [_, letter, text] = match;
      options.push(text.trim());
      
      // Check if this is the correct answer
      if (text.trim() === correctAnswer) {
        correctIndex = options.length - 1;
      }
    }
  }

  // If we couldn't find the correct answer in options, add it
  if (correctIndex === -1 && correctAnswer) {
    options.push(correctAnswer);
    correctIndex = options.length - 1;
  }

  // Skip if we don't have enough options or no correct answer
  if (options.length < 2 || correctIndex === -1) {
    return null;
  }

  return {
    question,
    options,
    correctAnswer: correctIndex,
    category: 'Unknown', // Will be set by the caller
    difficulty: 'medium' // Default difficulty
  };
}

/**
 * Parse a category file and return an array of questions
 */
function parseCategoryFile(filePath, categoryName) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const questionBlocks = content.split('\n\n');
    
    const questions = [];
    for (const block of questionBlocks) {
      const question = parseQuestionBlock(block);
      if (question) {
        question.category = categoryName;
        questions.push(question);
      }
    }
    
    return questions;
  } catch (error) {
    console.error(`Error parsing category file ${filePath}:`, error);
    return [];
  }
}

/**
 * Get questions for a specific category
 */
function getQuestionsForCategory(category) {
  // Check cache first
  if (questionCache.has(category)) {
    return questionCache.get(category);
  }

  const basePath = path.join(__dirname, 'OpenTriviaQA-master', 'categories');
  const categoryFile = path.join(basePath, category.toLowerCase());
  
  if (!fs.existsSync(categoryFile)) {
    console.error(`Category file not found: ${categoryFile}`);
    return [];
  }

  const questions = parseCategoryFile(categoryFile, category);
  
  // Cache the results
  questionCache.set(category, questions);
  
  return questions;
}

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseQuestionBlock,
    parseCategoryFile,
    getQuestionsForCategory
  };
}
