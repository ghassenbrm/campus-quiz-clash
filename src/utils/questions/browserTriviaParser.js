/**
 * Browser-compatible parser for OpenTriviaQA text format
 * This version uses Vite's import.meta.glob for file imports
 */

// Import all question files at build time
console.log('Importing question files...');
const questionFiles = import.meta.glob(
  './OpenTriviaQA-master/categories/*',
  { as: 'raw', eager: true }
);

// Log the files that were found
console.log('Available question files:', Object.keys(questionFiles).length);
Object.keys(questionFiles).forEach(path => {
  console.log(' -', path);
});

// Cache for parsed questions
const questionCache = new Map();

// Map of our category IDs to OpenTriviaQA file names
const CATEGORY_FILES = {
  'general': 'general',
  'science': 'science-technology',
  'history': 'history',
  'geography': 'geography',
  'sports': 'sports',
  'entertainment': 'entertainment',
  'movies': 'movies',
  'music': 'music',
  'television': 'television',
  'video-games': 'video-games',
  'animals': 'animals',
  'literature': 'literature',
  'random': 'general'
};

/**
 * Parse a single question block
 */
function parseQuestionBlock(block) {
  const lines = block.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 3) return null; // Not a valid question block

  // Extract question (first line after removing #Q)
  const question = lines[0].replace(/^#Q\s*/, '').trim();
  
  // The correct answer is on the line starting with ^
  let correctAnswer = '';
  const options = [];
  
  // Process all lines starting from the second line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('^')) {
      // This is the correct answer line
      correctAnswer = line.replace(/^\^\s*/, '').trim();
    } else {
      // This is an option line (A, B, C, etc.)
      const match = line.match(/^[A-Z]\s+(.+)$/);
      if (match) {
        options.push(match[1].trim());
      }
    }
  }

  // Verify we have a correct answer and at least 2 options
  if (!correctAnswer || options.length < 2) {
    console.warn('Invalid question format - missing correct answer or options:', { question, correctAnswer, options });
    return null;
  }

  // Find the index of the correct answer in the options (case-insensitive)
  const correctIndex = options.findIndex(opt => 
    opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  );

  // If correct answer not found in options, add it
  if (correctIndex === -1) {
    options.push(correctAnswer);
    correctIndex = options.length - 1;
  }

  return {
    question,
    choices: options, // Using 'choices' to match the expected format in Practice.jsx
    answer: correctIndex,
    category: 'Unknown', // Will be set by the caller
    difficulty: 'medium', // Default difficulty
    id: `q${Date.now()}-${Math.floor(Math.random() * 1000)}` // Generate a unique ID
  };
}

/**
 * Parse category content and return questions
 */
function parseCategoryContent(content, category) {
  if (!content) return [];
  
  const questionBlocks = content.split('\n\n');
  const questions = [];
  
  for (const block of questionBlocks) {
    const question = parseQuestionBlock(block);
    if (question) {
      question.category = category;
      questions.push(question);
    }
  }
  
  return questions;
}

/**
 * Load questions for a category
 */
function loadCategoryQuestions(category) {
  const normalizedCategory = category.toLowerCase();
  
  // Check cache first
  if (questionCache.has(normalizedCategory)) {
    return questionCache.get(normalizedCategory);
  }
  
  const categoryFile = CATEGORY_FILES[normalizedCategory] || 'general';
  const filePath = `./OpenTriviaQA-master/categories/${categoryFile}`;
  
  try {
    console.log(`Loading questions for category: ${category} (${filePath})`);
    
    // Get the file content from the pre-loaded files
    const fileContent = questionFiles[filePath];
    if (!fileContent) {
      console.warn(`No question file found for category: ${category} at path: ${filePath}`);
      console.log('Available files:', Object.keys(questionFiles));
      return [];
    }
    
    console.log(`Found file content for ${category}, length: ${fileContent.length} chars`);
    const questions = parseCategoryContent(fileContent, category);
    console.log(`Parsed ${questions.length} questions for category: ${category}`);
    
    // Cache the results
    questionCache.set(normalizedCategory, questions);
    return questions;
  } catch (error) {
    console.error(`Error loading questions for category ${category}:`, error);
    return [];
  }
}

/**
 * Get questions for a specific category
 */
export async function getQuestionsForCategory(category, count = 10) {
  try {
    const questions = loadCategoryQuestions(category);
    
    // Shuffle and select the requested number of questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  } catch (error) {
    console.error(`Error getting questions for ${category}:`, error);
    return [];
  }
}

// Preload all categories when this module is loaded
Object.keys(CATEGORY_FILES).forEach(loadCategoryQuestions);

// Export for testing
export const __test__ = {
  parseQuestionBlock,
  parseCategoryContent,
  loadCategoryQuestions
};
