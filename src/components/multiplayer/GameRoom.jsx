import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  FaUsers, 
  FaTrophy, 
  FaCheck, 
  FaTimes, 
  FaClock, 
  FaPlay, 
  FaSpinner, 
  FaCopy, 
  FaCheckCircle,
  FaGamepad,
  FaUserFriends,
  FaQuestion,
  FaArrowRight
} from 'react-icons/fa';
import Avatar from '../common/Avatar';
import { getQuestions } from '../../utils/questions/triviaService';
import '../../styles/game-room.css';

export default function GameRoom() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { username, isHost, userId } = location.state || {};
  
  const [room, setRoom] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [gameState, setGameState] = useState('waiting'); // waiting, question, results, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(20); // 20 seconds per question
  const timerRef = useRef(null);
  
  // Timer effect
  useEffect(() => {
    // Clear any existing timer when component unmounts or game state changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Reset and start timer when question changes
  useEffect(() => {
    if (gameState === 'question') {
      // Reset timer
      setTimeLeft(20);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Start new timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            // Time's up! Handle auto-submit or move to results
            if (selectedAnswer === null) {
              handleAnswerSelect(-1); // -1 indicates no answer
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      // Cleanup on unmount or when question changes
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [gameState, currentQuestion?.id]);
  
  // Listen for room updates
  useEffect(() => {
    if (!roomCode || !userId) {
      navigate('/multiplayer');
      return;
    }

    const roomRef = doc(db, 'rooms', roomCode);
    let isMounted = true;
    let questionChanged = false;

    const unsubscribe = onSnapshot(roomRef, async (doc) => {
      if (!doc.exists()) {
        console.log('Room document does not exist');
        setError('Room not found');
        return;
      }
      
      const roomData = doc.data();
      console.log('Room data updated:', {
        status: roomData.status,
        currentQuestionIndex: roomData.currentQuestionIndex,
        currentQuestion: roomData.currentQuestion ? {
          id: roomData.currentQuestion.id,
          question: roomData.currentQuestion.question,
          hasChoices: !!(roomData.currentQuestion.choices || roomData.currentQuestion.options)
        } : null,
        players: roomData.players ? Object.keys(roomData.players).length : 0
      });
      
      if (!isMounted) {
        console.log('Component unmounted, ignoring update');
        return;
      }
      
      // Check if the question has changed
      const newQuestionId = roomData.currentQuestion?.id;
      const currentQuestionId = room?.currentQuestion?.id;
      const questionChanged = newQuestionId && newQuestionId !== currentQuestionId;
      
      // Check if we're moving from results to a new question
      const wasInResults = gameState === 'results';
      
      // Update room data first
      setRoom(roomData);
      
      // Handle question changes
      if (roomData.currentQuestion) {
        if (questionChanged || !currentQuestion) {
          console.log('Setting new question:', {
            id: roomData.currentQuestion.id,
            question: roomData.currentQuestion.question,
            hasChoices: !!(roomData.currentQuestion.choices || roomData.currentQuestion.options)
          });
          
          setCurrentQuestion(roomData.currentQuestion);
          setSelectedAnswer(null);
          
          // Set game state to question first, then start timer in next effect
          if (gameState !== 'question') {
            console.log('Setting game state to question');
            setGameState('question');
          }
        }
      } else if (roomData.status === 'waiting') {
        console.log('Room is in waiting state, resetting to waiting');
        setGameState('waiting');
      } else if (roomData.status === 'finished') {
        console.log('Game is finished, showing results');
        setGameState('finished');
      }
      
      // Update players list
      if (roomData.players) {
        const playersList = Object.entries(roomData.players).map(([id, player]) => ({
          id,
          ...player
        }));
        setPlayers(playersList);
      }
      
      // Handle game state transitions
      if (roomData.status === 'in-progress') {
        // Check if all players have answered
        const allPlayersAnswered = roomData.players && 
          Object.values(roomData.players).every(p => p.answer !== undefined && p.answer !== null);
        
        if (allPlayersAnswered && gameState === 'question') {
          console.log('All players have answered');
          setGameState('results');
          clearInterval(timerRef.current);
        }
      } else if (roomData.status === 'finished' && gameState !== 'finished') {
        setGameState('finished');
        clearInterval(timerRef.current);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomCode, navigate, userId, isHost, gameState]);
  
  // Handle player leaving the room
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!roomCode || !userId) return;
      
      try {
        const roomRef = doc(db, 'rooms', roomCode);
        await updateDoc(roomRef, {
          [`players.${userId}`]: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error removing player:', err);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [roomCode, userId]);
  
  // Add a ref to track the current game state
  const gameStateRef = useRef(gameState);
  
  // Update the ref whenever gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  const handleAllPlayersAnswered = async () => {
    if (gameStateRef.current !== 'question') {
      console.log('Not in question state, ignoring all players answered', { currentState: gameStateRef.current });
      return;
    }
    
    console.log('All players have answered, moving to results...');
    
    try {
      // Update local state immediately for better UX
      setGameState('results');
      
      // Only the host should update the room state
      if (isHost) {
        const roomRef = doc(db, 'rooms', roomCode);
        
        // Mark any players who haven't answered as incorrect
        const updates = {};
        let needsUpdate = false;
        
        Object.entries(room?.players || {}).forEach(([playerId, player]) => {
          if (player.answer === undefined || player.answer === null) {
            updates[`players.${playerId}.answer`] = -1; // Mark as not answered
            updates[`players.${playerId}.isCorrect`] = false;
            updates[`players.${playerId}.answeredAt`] = serverTimestamp();
            needsUpdate = true;
          }
        });
        
        try {
          // Only update if there are changes
          if (needsUpdate) {
            console.log('Updating room with unanswered players');
            await updateDoc(roomRef, {
              ...updates,
              updatedAt: serverTimestamp()
            });
          }
          
          // Set a timer to move to the next question
          console.log('Setting timer for next question');
          clearTimeout(questionTimerRef.current); // Clear any existing timer
          questionTimerRef.current = setTimeout(async () => {
            console.log('Timer expired, moving to next question');
            try {
              await moveToNextQuestion();
            } catch (err) {
              console.error('Error moving to next question:', err);
              setError('Failed to move to next question: ' + (err.message || 'Unknown error'));
            }
          }, 5000); // Give 5 seconds to see the results
          
        } catch (err) {
          console.error('Error updating room state:', err);
          // Still try to move to next question even if there was an error
          if (isHost) {
            setTimeout(() => moveToNextQuestion().catch(console.error), 1000);
          }
        }
      }
      
    } catch (err) {
      console.error('Error handling time up:', err);
      setError('Failed to update game state. Please try again.');
      setGameState('results'); // Still try to show results even if there was an error
    }
  };
  
  const checkAllPlayersAnswered = (playersData) => {
    if (!playersData || typeof playersData !== 'object') return false;
    
    const playerIds = Object.keys(playersData);
    if (playerIds.length === 0) return false;
    
    return playerIds.every(playerId => {
      const player = playersData[playerId];
      return player.answer !== null && player.answer !== undefined;
    });
  };

  const handleAnswerSelect = async (answerIndex) => {
    if (selectedAnswer !== null || gameState !== 'question' || !room || !userId) return;
    
    setSelectedAnswer(answerIndex);
    
    try {
      // Check for both correctAnswer and answer properties
      const correctAnswer = currentQuestion.correctAnswer !== undefined 
        ? currentQuestion.correctAnswer 
        : currentQuestion.answer;
        
      const isCorrect = correctAnswer === answerIndex;
      const pointsEarned = isCorrect ? 10 : 0;
      
      const roomRef = doc(db, 'rooms', roomCode);
      
      // Only update if the player hasn't answered yet
      if (room.players[userId]?.answer === undefined || room.players[userId]?.answer === null) {
        const updateData = {
          [`players.${userId}.answer`]: answerIndex,
          [`players.${userId}.isCorrect`]: isCorrect,
          [`players.${userId}.answeredAt`]: serverTimestamp(),
          'updatedAt': serverTimestamp()
        };
        
        if (pointsEarned > 0) {
          updateData[`players.${userId}.score`] = (room.players[userId]?.score || 0) + pointsEarned;
        }
        
        await updateDoc(roomRef, updateData);
      }
      
      // Don't set gameState to 'results' here - let the onSnapshot handle this
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer: ' + (err.message || 'Unknown error'));
      setSelectedAnswer(null);
    }
  };
  
  const moveToNextQuestion = async () => {
    if (!isHost) {
      console.log('Only host can move to next question');
      return;
    }
    
    if (!room?.questions || !Array.isArray(room.questions)) {
      console.error('No questions available in room:', room);
      setError('No questions available');
      return;
    }
    
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const currentIndex = room.currentQuestionIndex || 0;
      const nextQuestionIndex = currentIndex + 1;
      
      console.log('Attempting to move to question index:', nextQuestionIndex, 'of', room.questions.length - 1);
      
      if (nextQuestionIndex >= room.questions.length) {
        console.log('No more questions, ending game');
        // Update game state to finished
        await updateDoc(roomRef, {
          status: 'finished',
          updatedAt: serverTimestamp()
        });
        setGameState('finished');
        return;
      }
      
      console.log('Moving to next question:', nextQuestionIndex);
      
      // Get the next question
      const nextQuestion = room.questions[nextQuestionIndex];
      if (!nextQuestion) {
        console.error('No question found at index:', nextQuestionIndex);
        setError('Failed to load next question');
        return;
      }
      
      console.log('Next question data:', {
        id: nextQuestion.id,
        question: nextQuestion.question,
        hasChoices: !!(nextQuestion.choices || nextQuestion.options)
      });
      
      // Create player updates object
      const playerUpdates = {};
      const playerIds = Object.keys(room.players || {});
      
      if (playerIds.length === 0) {
        console.warn('No players in the room to update');
      } else {
        playerIds.forEach(playerId => {
          playerUpdates[`players.${playerId}.answer`] = null;
          playerUpdates[`players.${playerId}.isCorrect`] = null;
          playerUpdates[`players.${playerId}.answeredAt`] = null;
        });
      }
      
      // Single atomic update for both question and player states
      const updateData = {
        currentQuestion: nextQuestion,
        currentQuestionIndex: nextQuestionIndex,
        status: 'in-progress',
        updatedAt: serverTimestamp(),
        ...playerUpdates
      };
      
      console.log('Updating room with next question:', {
        questionIndex: nextQuestionIndex,
        questionId: nextQuestion.id,
        playerUpdates: Object.keys(playerUpdates).length / 3 // Each player has 3 fields updated
      });
      
      await updateDoc(roomRef, updateData);
      
      // Update local state
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer(null);
      setGameState('question');
      
      console.log('Moved to question', nextQuestionIndex);
      
    } catch (err) {
      console.error('Error moving to next question:', err);
      setError('Failed to move to next question: ' + (err.message || 'Unknown error'));
      
      // Try to recover by setting game state to results
      setGameState('results');
    }
  };

  const startGame = async () => {
    if (!isHost || !roomCode || !room) return;
    
    try {
      setGameState('loading');
      console.log('Starting game with category:', room.category);
      
      // Get questions from OpenTriviaQA
      const questions = await getQuestions(room.category || 'general');
      
      if (!questions || questions.length === 0) {
        throw new Error(`No questions found for category: ${room.category}`);
      }
      
      console.log(`Loaded ${questions.length} questions for category: ${room.category}`);
      
      // Limit to 10 questions per game for better performance
      const selectedQuestions = questions.slice(0, 10);
      
      const roomRef = doc(db, 'rooms', roomCode);
      
      // Single atomic update to set everything at once
      await updateDoc(roomRef, {
        status: 'in-progress',
        questions: selectedQuestions,
        currentQuestion: selectedQuestions[0],
        currentQuestionIndex: 0,
        updatedAt: serverTimestamp(),
        // Reset all player answers
        ...Object.keys(room.players || {}).reduce((acc, playerId) => ({
          ...acc,
          [`players.${playerId}.answer`]: null,
          [`players.${playerId}.isCorrect`]: null,
          [`players.${playerId}.answeredAt`]: null
        }), {})
      });
      
      console.log('Game started and first question set');
      
    } catch (err) {
      console.error('Error starting game:', err);
      setError(err.message || 'Failed to start game');
      setGameState('waiting');
    }
  };

  const renderWaitingRoom = () => (
    <div className="waiting-room">
      <div className="game-header">
        <div className="room-code-display" onClick={() => {
          navigator.clipboard.writeText(roomCode);
          alert('Room code copied to clipboard!');
        }}>
          <FaGamepad className="mr-2" />
          {roomCode}
          <FaCopy className="ml-3 opacity-70 hover:opacity-100" />
        </div>
        <p className="text-gray-600 mt-2">Share this code with friends to join</p>
      </div>
      
      <div className="player-list">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Players</h3>
          <div className="text-sm text-gray-500">
            {Object.keys(room?.players || {}).length}/10 joined
          </div>
        </div>
        
        <div className="player-grid">
          {Object.entries(room?.players || {}).map(([playerId, player]) => (
            <div 
              key={playerId} 
              className={`player-card ${playerId === userId ? 'you' : ''}`}
            >
              <div className="player-avatar">
                {player.avatar ? (
                  <img 
                    src={`/avatars/${player.avatar}_final.svg`} 
                    alt={player.username || 'Player'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.username || 'P')}&background=4f46e5&color=fff`;
                    }}
                  />
                ) : (
                  <span>{(player.username || 'P').charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div className="player-info">
                <div className="player-name">
                  {player.username || 'Guest'}
                  {playerId === room?.hostId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </div>
                <div className="player-status">
                  <span className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      player.isReady ? 'bg-green-500' : 'bg-gray-300'
                    }`}></span>
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              </div>
              
              <div className="player-score">
                {player.score || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="button-group">
        {isHost ? (
          <button 
            className="btn btn-primary btn-lg"
            onClick={startGame}
            disabled={Object.keys(room?.players || {}).length < 2}
          >
            <FaPlay className="mr-2" />
            Start Game
            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
              {Object.keys(room?.players || {}).length}/10
            </span>
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="flex items-center justify-center text-gray-600 mb-2">
              <FaSpinner className="animate-spin mr-2" />
              Waiting for host to start the game...
            </div>
            <p className="text-sm text-gray-500">
              {Object.keys(room?.players || {}).length} player{Object.keys(room?.players || {}).length !== 1 ? 's' : ''} in the room
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Need help? Share the room code with friends to play together!</p>
      </div>
    </div>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    // Handle both 'options' and 'choices' properties for backward compatibility
    const questionChoices = currentQuestion.options || currentQuestion.choices || [];
    const currentQuestionIndex = room?.currentQuestionIndex || 0;
    const totalQuestions = room?.questions?.length || 1;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    
    // Log question data for debugging
    console.log('Current question:', {
      question: currentQuestion.question,
      choices: questionChoices,
      correctAnswer: currentQuestion.correctAnswer,
      answer: currentQuestion.answer
    });
    
    return (
      <div className="game-content">
        {/* Progress Bar */}
        <div className="progress-container mb-6">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <div className="progress-text">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
        </div>
        
        {/* Question Card */}
        <div className="question-card bg-white rounded-xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 w-full h-2"></div>
          
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 text-blue-700 font-bold rounded-full w-8 h-8 flex items-center justify-center mr-3">
              {currentQuestionIndex + 1}
            </div>
            <span className="text-sm font-medium text-gray-500">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-6 leading-tight">
            {currentQuestion.question}
          </h2>
          
          {/* Timer */}
          <div className="timer-container">
            <div 
              className="timer-bar" 
              style={{ width: `${(timeLeft / 20) * 100}%` }}
            ></div>
          </div>
          <div className="timer-text">
            <FaClock className="inline mr-1" />
            {timeLeft} seconds remaining
          </div>
          
          {/* Answer Options */}
          <div className="options-grid">
            {questionChoices.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === (currentQuestion.correctAnswer || currentQuestion.answer);
              let optionClass = 'option-button';
              
              if (selectedAnswer !== null) {
                if (isSelected) {
                  optionClass += isCorrect ? ' correct' : ' incorrect';
                } else if (isCorrect) {
                  optionClass += ' correct';
                }
              } else if (isSelected) {
                optionClass += ' selected';
              }
              
              return (
                <button
                  key={index}
                  className={optionClass}
                  onClick={() => !selectedAnswer && handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option-text">{option}</span>
                  
                  {selectedAnswer !== null && (
                    <span className="absolute right-4">
                      {isCorrect ? (
                        <FaCheck className="text-green-500" />
                      ) : isSelected ? (
                        <FaTimes className="text-red-500" />
                      ) : null}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Player Status */}
        <div className="player-status-container mt-6">
          <h3 className="text-lg font-semibold mb-3">Players</h3>
          <div className="player-grid">
            {players.map((player) => (
              <div key={player.id} className="player-card">
                <div className="player-avatar">
                  {player.avatar ? (
                    <img 
                      src={`/avatars/${player.avatar}_final.svg`} 
                      alt={player.username || 'Player'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.username || 'P')}&background=4f46e5&color=fff`;
                      }}
                    />
                  ) : (
                    <span>{(player.username || 'P').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                
                <div className="player-info">
                  <div className="player-name">
                    {player.username || 'Guest'}
                    {player.id === userId && ' (You)'}
                  </div>
                  <div className="player-status">
                    {player.answer === null || player.answer === undefined ? (
                      <span className="text-yellow-600">
                        <FaClock className="inline mr-1" />
                        Thinking...
                      </span>
                    ) : (
                      <span className="text-green-600">
                        <FaCheck className="inline mr-1" />
                        Answered
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="player-score">
                  {player.score || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {gameState === 'results' && (
          <div className="alert alert-info">
            {selectedAnswer === currentQuestion.correctAnswer 
              ? 'Correct! ' + (currentQuestion.explanation || '')
              : `Incorrect. The correct answer is ${String.fromCharCode(65 + currentQuestion.correctAnswer)}) ${questionChoices[currentQuestion.correctAnswer]}. ` + (currentQuestion.explanation || '')}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!currentQuestion || !room?.players) return null;
    
    const playerList = Object.entries(room.players).map(([id, player]) => ({
      id,
      ...player,
      isCurrentUser: id === userId
    }));
    
    // Sort players by score (highest first)
    const sortedPlayers = [...playerList].sort((a, b) => (b.score || 0) - (a.score || 0));
    const allPlayersAnswered = checkAllPlayersAnswered(room.players);
    
    return (
      <div className="results-container max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-center mb-6">Results</h3>
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`relative p-4 rounded-lg shadow-sm border ${
                player.isCurrentUser 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center">
                {/* Player position/rank */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold mr-3">
                  {index + 1}
                </div>
               
                {/* Player avatar */}
                <div className="flex-shrink-0">
                  <Avatar 
                    userId={player.id}
                    username={player.username}
                    size="md"
                    className="mr-3"
                  />
                </div>
                
                {/* Player info */}
                <div className="flex-grow">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium">
                      {player.username || 'Player'}
                      {player.isCurrentUser && (
                        <span className="ml-2 text-sm text-gray-500">(You)</span>
                      )}
                      {player.id === room?.hostId && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Host
                        </span>
                      )}
                    </h4>
                    
                    {/* Answer status */}
                    <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                      player.answer === undefined || player.answer === null
                        ? 'bg-gray-100 text-gray-800'
                        : player.isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {player.answer === undefined || player.answer === null
                        ? 'No answer'
                        : player.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex items-center">
                    <div className="text-sm text-gray-600">
                      Score: <span className="font-bold">{player.score || 0} points</span>
                    </div>
                    
                    {/* Show points earned this round if available */}
                    {player.pointsEarned !== undefined && player.pointsEarned > 0 && (
                      <span className="ml-3 text-sm font-medium text-green-600">
                        +{player.pointsEarned} this round
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="player-score">
                  {player.score || 0}
                </div>
              </div>
            </div>
          ))}
          
          {allPlayersAnswered && isHost && (
            <div className="text-center mt-4">
              <button 
                onClick={moveToNextQuestion}
                className="btn btn-primary btn-lg"
              >
                {room?.currentQuestionIndex < (room?.questions?.length || 0) - 1 ? 'Next Question' : 'Show Results'}
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          )}
          
          {allPlayersAnswered && !isHost && (
            <div className="alert alert-info text-center mt-4">
              Waiting for host to start the next question...
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const currentPlayer = players.find(p => p.id === userId);
    const currentPlayerRank = sortedPlayers.findIndex(p => p.id === userId) + 1;
    const totalPlayers = sortedPlayers.length;
    
    return (
      <div className="leaderboard-container">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <FaTrophy className="text-yellow-500 text-4xl mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Game Over!</h2>
          </div>
          
          {currentPlayer && (
            <div className="bg-white rounded-xl shadow-md p-6 max-w-md mx-auto mb-8">
              <div className="text-sm text-gray-500 mb-2">Your Rank</div>
              <div className="text-5xl font-bold text-blue-600 mb-2">
                #{currentPlayerRank}
                <span className="text-gray-400 text-2xl">/{totalPlayers}</span>
              </div>
              <div className="text-2xl font-semibold mb-4">{currentPlayer.username}</div>
              
              <div className="flex justify-between border-t border-gray-100 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentPlayer.score || 0}</div>
                  <div className="text-sm text-gray-500">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round((players.filter(p => p.score < (currentPlayer.score || 0)).length / totalPlayers) * 100)}%
                  </div>
                  <div className="text-sm text-gray-500">Better Than</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {players.filter(p => p.isCorrect).length}
                  </div>
                  <div className="text-sm text-gray-500">Correct Answers</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="leaderboard">
          <div className="leaderboard-header">
            <h3 className="text-xl font-semibold">Final Standings</h3>
            <div className="text-sm text-gray-500">
              {sortedPlayers.length} Player{sortedPlayers.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="leaderboard-list">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className={`leaderboard-item ${player.id === userId ? 'you' : ''}`}
              >
                <div className="leaderboard-position">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                
                <div className="leaderboard-avatar">
                  {player.avatar ? (
                    <img 
                      src={`/avatars/${player.avatar}_final.svg`}
                      alt={player.username || 'Player'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.username || 'P')}&background=4f46e5&color=fff`;
                      }}
                    />
                  ) : (
                    <span>{(player.username || 'P').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                
                <div className="leaderboard-info">
                  <div className="leaderboard-name">
                    {player.username || 'Guest'}
                    {player.id === userId && ' (You)'}
                  </div>
                  <div className="leaderboard-status">
                    {player.id === room?.hostId && (
                      <span className="badge badge-primary">Host</span>
                    )}
                    <span className="text-sm text-gray-500 ml-2">
                      {player.correctAnswers || 0} correct • {player.score || 0} pts
                    </span>
                  </div>
                </div>
                
                <div className="leaderboard-score">
                  {player.score || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="button-group mt-8">
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => window.location.reload()}
          >
            Play Again
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {gameState === 'waiting' && renderWaitingRoom()}
          {gameState === 'question' && renderQuestion()}
          {gameState === 'results' && renderResults()}
          {gameState === 'finished' && renderLeaderboard()}
        </div>
      </div>
    </div>
  );
}
