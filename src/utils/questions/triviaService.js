/**
 * Trivia Question Service
 * Loads questions from local OpenTriviaQA files using the browser-compatible parser
 */

import { getQuestionsForCategory as getOpenTriviaQuestions } from './browserTriviaParser';

// Map of our category IDs to display names
const CATEGORY_NAMES = {
  'general': 'General Knowledge',
  'science': 'Science & Technology',
  'history': 'History',
  'geography': 'Geography',
  'sports': 'Sports',
  'movies': 'Movies',
  'music': 'Music',
  'television': 'Television',
  'video-games': 'Video Games',
  'animals': 'Animals',
  'literature': 'Literature',
  'entertainment': 'Entertainment',
  'random': 'Random Mix'
};

// Fallback questions in case loading fails
const FALLBACK_QUESTIONS = {
  'sports': [
    {
      id: 'spt-1',
      question: 'Which country won the FIFA World Cup in 2022?',
      options: ['France', 'Argentina', 'Brazil', 'Germany'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-2',
      question: 'How many players are there in a standard soccer team?',
      options: ['9', '10', '11', '12'],
      correctAnswer: 2,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-3',
      question: 'Which sport is known as "the beautiful game"?',
      options: ['Basketball', 'Tennis', 'Soccer', 'Golf'],
      correctAnswer: 2,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-4',
      question: 'In tennis, what is a zero score called?',
      options: ['Nil', 'Love', 'Zero', 'Nada'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'medium'
    },
    {
      id: 'spt-5',
      question: 'Which country has won the most Olympic gold medals in history?',
      options: ['China', 'Russia', 'United States', 'Great Britain'],
      correctAnswer: 2,
      category: 'Sports',
      difficulty: 'medium'
    },
    {
      id: 'spt-6',
      question: 'In which sport would you perform a slam dunk?',
      options: ['Volleyball', 'Basketball', 'Tennis', 'Badminton'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-7',
      question: 'How many rings are on the Olympic flag?',
      options: ['4', '5', '6', '7'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-8',
      question: 'Which country hosted the 2016 Summer Olympics?',
      options: ['China', 'Brazil', 'Russia', 'Japan'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-9',
      question: 'In golf, what is a score of one under par called?',
      options: ['Eagle', 'Birdie', 'Bogey', 'Albatross'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'medium'
    },
    {
      id: 'spt-10',
      question: 'Which sport uses a shuttlecock?',
      options: ['Tennis', 'Badminton', 'Squash', 'Table Tennis'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-11',
      question: 'What is the maximum score possible in a single frame of bowling?',
      options: ['10', '20', '30', '40'],
      correctAnswer: 2,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-12',
      question: 'Which country is famous for the sport of sumo wrestling?',
      options: ['China', 'Japan', 'South Korea', 'Thailand'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-13',
      question: 'In which sport would you use a "puck"?',
      options: ['Cricket', 'Hockey', 'Tennis', 'Golf'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'easy'
    },
    {
      id: 'spt-14',
      question: 'How many players are on a baseball team in the field?',
      options: ['7', '8', '9', '10'],
      correctAnswer: 2,
      category: 'Sports',
      difficulty: 'medium'
    },
    {
      id: 'spt-15',
      question: 'Which sport awards the yellow jersey to its leader?',
      options: ['Giro d\'Italia', 'Tour de France', 'Vuelta a España', 'Tour de Suisse'],
      correctAnswer: 1,
      category: 'Sports',
      difficulty: 'medium'
    }
  ],
  // Other categories...
};

/**
 * Fetch questions for a specific category
 * @param {string} category - The category ID (e.g., 'general', 'science')
 * @param {number} count - Number of questions to return
 * @returns {Promise<Array>} - Array of formatted questions
 */
export const fetchQuestions = async (category = 'general', count = 10) => {
  const normalizedCategory = category.toLowerCase();
  
  try {
    // First try to get questions from OpenTriviaQA
    const questions = await getOpenTriviaQuestions(normalizedCategory, count);
    
    if (questions && questions.length > 0) {
      // Add category name to each question
      const categorizedQuestions = questions.map(q => ({
        ...q,
        category: CATEGORY_NAMES[normalizedCategory] || normalizedCategory
      }));
      
      return categorizedQuestions;
    }
    
    // Fallback to hardcoded questions if OpenTriviaQA fails
    console.warn(`No questions found for category ${normalizedCategory}, using fallback`);
    return getFallbackQuestions(normalizedCategory);
  } catch (error) {
    console.error(`Error fetching questions for ${normalizedCategory}:`, error);
    return getFallbackQuestions(normalizedCategory);
  }
};

/**
 * Formats raw questions from OpenTriviaQA to our app's format
 */
const formatQuestions = (data, category) => {
  if (!data || !data.questions) return [];
  
  return data.questions.map((q, index) => ({
    id: `q-${category}-${index}`,
    question: q.question,
    options: shuffleArray([...q.incorrect_answers, q.correct_answer]),
    correctAnswer: q.incorrect_answers.length, // Correct answer is always last after shuffling
    category: category,
    difficulty: q.difficulty || 'medium'
  }));
};

/**
 * Shuffles array in place
 */
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Fallback questions in case of fetch failure
 */
const getFallbackQuestions = (category) => {
  // Return a small set of fallback questions
  const fallbacks = {
    general: [
      {
        id: 'fallback-1',
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        category: 'General Knowledge',
        difficulty: 'easy'
      }
    ],
    sports: [
      {
        id: 'fallback-sports-1',
        question: 'Which country won the FIFA World Cup in 2022?',
        options: ['France', 'Argentina', 'Brazil', 'Germany'],
        correctAnswer: 1,
        category: 'Sports',
        difficulty: 'easy'
      }
    ],
    science: [
      {
        id: 'fallback-sci-1',
        question: 'What is the chemical symbol for water?',
        options: ['H2O', 'CO2', 'NaCl', 'O2'],
        correctAnswer: 0,
        category: 'Science & Technology',
        difficulty: 'easy'
      }
    ],
    movies: [
      {
        id: 'fallback-mov-1',
        question: 'Which movie won the Academy Award for Best Picture in 2020?',
        options: ['Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'],
        correctAnswer: 0,
        category: 'Movies',
        difficulty: 'medium'
      }
    ],
    music: [
      {
        id: 'fallback-mus-1',
        question: 'Which artist has won the most Grammy Awards of all time?',
        options: ['Beyoncé', 'Quincy Jones', 'Alison Krauss', 'Georg Solti'],
        correctAnswer: 3,
        category: 'Music',
        difficulty: 'hard'
      }
    ],
    television: [
      {
        id: 'fallback-tv-1',
        question: 'Which TV show holds the record for most Emmy wins?',
        options: ['Game of Thrones', 'Saturday Night Live', 'The Simpsons', 'The West Wing'],
        correctAnswer: 0,
        category: 'Television',
        difficulty: 'medium'
      }
    ],
    'video-games': [
      {
        id: 'fallback-vg-1',
        question: 'Which game is considered the best-selling video game of all time?',
        options: ['Tetris', 'Minecraft', 'Grand Theft Auto V', 'Wii Sports'],
        correctAnswer: 1,
        category: 'Video Games',
        difficulty: 'medium'
      }
    ],
    animals: [
      {
        id: 'fallback-anim-1',
        question: 'What is the largest land animal in the world?',
        options: ['African Elephant', 'Polar Bear', 'Giraffe', 'Hippopotamus'],
        correctAnswer: 0,
        category: 'Animals',
        difficulty: 'easy'
      }
    ],
    literature: [
      {
        id: 'fallback-lit-1',
        question: 'Who wrote "To Kill a Mockingbird"?',
        options: ['Harper Lee', 'Truman Capote', 'J.D. Salinger', 'John Steinbeck'],
        correctAnswer: 0,
        category: 'Literature',
        difficulty: 'easy'
      }
    ]
  };
  
  return fallbacks[category] || fallbacks.general;
};

// Cached questions to avoid refetching
const questionCache = new Map();

/**
 * Get questions with caching
 */
export const getQuestions = async (category = 'general') => {
  const cacheKey = category;
  
  if (questionCache.has(cacheKey)) {
    return questionCache.get(cacheKey);
  }
  
  const questions = await fetchQuestions(category);
  questionCache.set(cacheKey, questions);
  return questions;
};
