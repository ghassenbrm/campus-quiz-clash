import React, { useState, useEffect } from 'react';
import { fetchQuestions } from '../utils/questions/triviaService';

const categories = [
  { id: 'general', name: 'General Knowledge' },
  { id: 'science', name: 'Science & Technology' },
  { id: 'history', name: 'History' },
  { id: 'geography', name: 'Geography' },
  { id: 'sports', name: 'Sports' },
  { id: 'movies', name: 'Movies' },
  { id: 'music', name: 'Music' },
  { id: 'television', name: 'Television' },
  { id: 'video-games', name: 'Video Games' },
  { id: 'animals', name: 'Animals' },
  { id: 'literature', name: 'Literature' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'random', name: 'Random Mix' }
];

const TestQuestions = () => {
  const [category, setCategory] = useState('general');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedQuestions = await fetchQuestions(category, 5);
      setQuestions(loadedQuestions);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [category]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Test Question Loading</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Category:
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded-md"
          disabled={isLoading}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={loadQuestions}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Reload Questions'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Questions for {categories.find(c => c.id === category)?.name}
        </h2>
        
        {isLoading ? (
          <div className="text-center py-8">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No questions found for this category.
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-medium mb-2">{q.question}</h3>
                <div className="space-y-2 mt-3">
                  {q.options.map((opt, optIndex) => (
                    <div 
                      key={optIndex}
                      className={`p-2 rounded ${
                        optIndex === q.correctAnswer 
                          ? 'bg-green-100 border border-green-300' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {opt}
                      {optIndex === q.correctAnswer && (
                        <span className="ml-2 text-green-600 text-sm">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Category: {q.category}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestQuestions;
