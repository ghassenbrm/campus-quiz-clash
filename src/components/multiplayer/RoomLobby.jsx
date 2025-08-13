import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  FaGamepad, 
  FaChevronDown, 
  FaCopy, 
  FaCheck, 
  FaArrowRight, 
  FaUserFriends, 
  FaUsers, 
  FaPlus, 
  FaSignInAlt, 
  FaArrowLeft,
  FaClock,
  FaQuestion
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { signInAnonymously } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/multiplayer.css';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
};

// Available quiz categories with emojis and colors
const QUIZ_CATEGORIES = [
  { id: 'general', name: 'General Knowledge', emoji: '🌍', color: '#4CAF50' },
  { id: 'science', name: 'Science & Tech', emoji: '🔬', color: '#2196F3' },
  { id: 'history', name: 'History', emoji: '🏛️', color: '#FF9800' },
  { id: 'geography', name: 'Geography', emoji: '🗺️', color: '#9C27B0' },
  { id: 'sports', name: 'Sports', emoji: '⚽', color: '#E91E63' },
  { id: 'movies', name: 'Movies', emoji: '🎬', color: '#673AB7' },
  { id: 'music', name: 'Music', emoji: '🎵', color: '#3F51B5' },
  { id: 'television', name: 'TV', emoji: '📺', color: '#00BCD4' },
  { id: 'video-games', name: 'Gaming', emoji: '🎮', color: '#795548' },
  { id: 'animals', name: 'Animals', emoji: '🐘', color: '#8BC34A' },
  { id: 'literature', name: 'Books', emoji: '📚', color: '#FF5722' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎭', color: '#607D8B' },
  { id: 'random', name: 'Random Mix', emoji: '🎲', color: '#9E9E9E' },
];

const RoomLobby = () => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(QUIZ_CATEGORIES[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('main'); // 'main', 'create', 'join'
  
  const navigate = useNavigate();
  const usernameInputRef = useRef(null);
  const roomCodeInputRef = useRef(null);
  
  // Set focus to username input when view changes
  useEffect(() => {
    if (view === 'create' || view === 'join') {
      const timer = setTimeout(() => {
        if (usernameInputRef.current) {
          usernameInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        // Sign in anonymously if not authenticated
        signInAnonymously(auth).catch((error) => {
          console.error('Anonymous sign-in error:', error);
          setError('Failed to initialize session. Please refresh the page.');
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Generate a random room code (4 uppercase letters)
  const generateRoomCode = () => {
    return Array(4)
      .fill(0)
      .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
      .join('');
  };

  // Create a new game room
  const createRoom = async (e) => {
    e?.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Generate a unique room code
      let newRoomCode = '';
      let roomExists = true;
      
      // Keep generating until we find an available code (max 5 attempts)
      let attempts = 0;
      while (roomExists && attempts < 5) {
        newRoomCode = generateRoomCode();
        const roomRef = doc(db, 'rooms', newRoomCode);
        const roomDoc = await getDoc(roomRef);
        roomExists = roomDoc.exists();
        attempts++;
      }

      if (roomExists) {
        throw new Error('Could not generate a unique room code. Please try again.');
      }

      // Create the room in Firestore
      const roomRef = doc(db, 'rooms', newRoomCode);
      await setDoc(roomRef, {
        code: newRoomCode,
        hostId: user.uid,
        hostName: username.trim(),
        category: selectedCategory.id,
        status: 'waiting',
        createdAt: serverTimestamp(),
        players: {
          [user.uid]: {
            id: user.uid,
            name: username.trim(),
            isHost: true,
            isReady: true,
            joinedAt: serverTimestamp(),
            score: 0,
            answers: {},
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username.trim())}&background=4f46e5&color=fff`
          }
        },
        currentQuestionIndex: -1,
        gameStarted: false
      });

      // Set the room code for the created view
      setRoomCode(newRoomCode);
      
      // Show the room created view
      setView('created');

    } catch (error) {
      console.error('Error creating room:', error);
      setError(error.message || 'Failed to create room. Please try again.');
      setIsCreating(false);
    }
  };

  // Join an existing game room
  const joinRoom = async (e) => {
    e?.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const roomRef = doc(db, 'rooms', roomCode.toUpperCase());
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        throw new Error('Room not found. Please check the code and try again.');
      }

      const roomData = roomDoc.data();

      if (roomData.status === 'in_progress' || roomData.gameStarted) {
        throw new Error('This game has already started. Please wait for the next round.');
      }

      // Add player to the room
      await updateDoc(roomRef, {
        [`players.${user.uid}`]: {
          id: user.uid,
          name: username.trim(),
          isHost: false,
          isReady: false,
          joinedAt: serverTimestamp(),
          score: 0,
          answers: {},
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username.trim())}&background=4f46e5&color=fff`
        }
      });

      // Navigate to the game room
      navigate(`/multiplayer/room/${roomCode.toUpperCase()}`, {
        state: {
          username: username.trim(),
          isHost: false,
          userId: user.uid
        }
      });

    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room. Please try again.');
      setIsJoining(false);
    }
  };

  // Copy room code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Room code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Handle back to main menu
  const handleBackToMain = () => {
    setView('main');
    setError('');
    setRoomCode('');
    setUsername('');
  };

  // Render main view
  const renderMainView = () => (
    <div className="lobby-container">
      <motion.div 
        className="lobby-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="lobby-header">
          <h1>Multiplayer Quiz</h1>
          <p>Challenge your friends in a battle of wits!</p>
        </div>
        
        <div className="lobby-actions">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-primary"
            onClick={() => setView('create')}
            disabled={isCreating || isJoining}
          >
            <FaGamepad className="btn-icon" />
            {isCreating ? 'Creating...' : 'Create New Room'}
          </motion.button>
          
          <div className="divider">
            <span>OR</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-secondary"
            onClick={() => setView('join')}
            disabled={isJoining || isCreating}
          >
            <FaUserFriends className="btn-icon" />
            Join Existing Room
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  // Render create room view
  const renderCreateView = () => (
    <div className="lobby-container">
      <motion.div
        className="lobby-card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
      >
        <div className="lobby-header">
          <h2>Create New Room</h2>
          <p>Choose a category and invite friends</p>
        </div>

        <form onSubmit={createRoom} className="lobby-form">
          <div className="form-group">
            <label>Your Name</label>
            <input
              ref={usernameInputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              maxLength={20}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <div className="category-selector">
              <div 
                className="category-selected"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                style={{ borderColor: selectedCategory.color }}
              >
                <span className="category-emoji">{selectedCategory.emoji}</span>
                <span>{selectedCategory.name}</span>
                <FaChevronDown className={`dropdown-icon ${showCategoryDropdown ? 'up' : ''}`} />
              </div>
              
              {showCategoryDropdown && (
                <div className="category-dropdown">
                  {QUIZ_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className="category-option"
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowCategoryDropdown(false);
                      }}
                      style={{ borderLeft: `4px solid ${category.color}` }}
                    >
                      <span className="category-emoji">{category.emoji}</span>
                      <span>{category.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="button-group">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleBackToMain}
              disabled={isCreating}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !username.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Room'}
              <FaArrowRight className="ml-2" />
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </form>
      </motion.div>
    </div>
  );

  // Render join room view
  const renderJoinView = () => (
    <div className="lobby-container">
      <motion.div 
        className="lobby-card"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <div className="lobby-header">
          <h2>Join a Room</h2>
          <p>Enter the room code to join your friends</p>
        </div>
        
        <form onSubmit={joinRoom} className="lobby-form">
          <div className="form-group">
            <label>Your Name</label>
            <input
              ref={usernameInputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              maxLength={20}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Room Code</label>
            <div className="room-code-display" onClick={() => copyToClipboard(roomCode)}>
              <input
                ref={roomCodeInputRef}
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="form-input text-center"
                maxLength={6}
                required
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
              />
            </div>
          </div>
          
          <div className="button-group">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleBackToMain}
              disabled={isJoining}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isJoining || !roomCode.trim() || !username.trim()}
            >
              {isJoining ? 'Joining...' : 'Join Room'}
              <FaArrowRight className="ml-2" />
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </form>
      </motion.div>
    </div>
  );

  // Render player list in the waiting room
  const renderPlayerList = (players = {}) => {
    const playerList = Object.values(players || {});
    
    if (playerList.length === 0) {
      return (
        <div className="players-waiting">
          <FaUsers className="icon" />
          <span>Waiting for players to join...</span>
        </div>
      );
    }

    return (
      <div className="players-list">
        <h3>Players in Room</h3>
        <div className="players-grid">
          {playerList.map((player) => (
            <div 
              key={player.id} 
              className={`player-card ${player.isHost ? 'host' : ''}`}
            >
              <div 
                className="player-avatar"
                style={{
                  background: `linear-gradient(135deg, ${selectedCategory?.color || '#4f46e5'}, #818cf8)`
                }}
              >
                {player.avatar ? (
                  <img 
                    src={`/avatars/${player.avatar}_final.svg`} 
                    alt={player.name || 'Player'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'P')}&background=4f46e5&color=fff`;
                    }}
                  />
                ) : (
                  <span>{player.name?.charAt(0) || 'P'}</span>
                )}
              </div>
              <div className="player-info">
                <div className="player-name">
                  {player.name || 'Guest'}
                  {player.isHost && <span className="player-host-badge">Host</span>}
                </div>
                <div className="player-status">
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Set up room data subscription when room is created
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (view !== 'created' || !roomCode) return;
    
    // Set up real-time listener for room updates
    const roomRef = doc(db, 'rooms', roomCode);
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        setRoomData(doc.data());
      }
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      setRoomData(null);
      setLoading(true);
    };
  }, [view, roomCode]);
  
  // Room created view
  const renderRoomCreatedView = () => {
    return (
      <div className="lobby-container">
        <motion.div 
          className="lobby-card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="lobby-header">
            <div className="success-icon">
              <FaCheck />
            </div>
            <h2>Room Created!</h2>
            <p>Share this code with your friends</p>
          </div>
          
          <div className="room-info">
            <div className="room-code-display" onClick={() => copyToClipboard(roomCode)}>
              <div className="room-code">
                <FaGamepad className="icon" />
                {roomCode}
              </div>
              <button 
                type="button" 
                className="copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(roomCode);
                }}
              >
                {copied ? <FaCheck /> : <FaCopy />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="room-meta">
              <div className="meta-item">
                <FaUserFriends className="icon" />
                {roomData?.players ? Object.keys(roomData.players).length : 0}/10 Players
              </div>
              <div className="meta-item">
                <FaQuestion className="icon" />
                {selectedCategory?.name || 'Mixed'} Questions
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-shimmer" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }}></div>
          ) : (
            renderPlayerList(roomData?.players)
          )}
        
          <div className="button-group">
            <button 
              className="btn btn-primary"
              onClick={() => {
                navigate(`/multiplayer/room/${roomCode}`, {
                  state: {
                    username: username.trim(),
                    isHost: true,
                    userId: user.uid
                  }
                });
              }}
              disabled={!roomData?.players || Object.keys(roomData.players).length < 1}
            >
              {roomData?.gameStarted ? 'Game in Progress' : 'Enter Room'}
              <FaArrowRight className="ml-2" />
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={handleBackToMain}
            >
              Back to Main
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Render the appropriate view based on state
  const renderView = () => {
    switch (view) {
      case 'create':
        return renderCreateView();
      case 'join':
        return renderJoinView();
      case 'created':
        return renderRoomCreatedView();
      default:
        return renderMainView();
    }
  };

  return (
    <div className="lobby-page">
      <AnimatePresence mode="wait">
        {renderView()}
      </AnimatePresence>
      <div id="toast-container"></div>
    </div>
  );
};

export default RoomLobby;
