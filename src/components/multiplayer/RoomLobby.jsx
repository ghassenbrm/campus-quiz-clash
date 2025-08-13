import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FaUserPlus, FaGamepad, FaUsers, FaChevronDown } from 'react-icons/fa';
import { signInAnonymously } from 'firebase/auth';

// Available quiz categories with emojis
const QUIZ_CATEGORIES = [
  { id: 'general', name: 'General Knowledge', emoji: '🌍' },
  { id: 'science', name: 'Science & Technology', emoji: '🔬' },
  { id: 'history', name: 'History', emoji: '🏛️' },
  { id: 'geography', name: 'Geography', emoji: '🗺️' },
  { id: 'sports', name: 'Sports', emoji: '⚽' },
  { id: 'movies', name: 'Movies', emoji: '🎬' },
  { id: 'music', name: 'Music', emoji: '🎵' },
  { id: 'television', name: 'Television', emoji: '📺' },
  { id: 'video-games', name: 'Video Games', emoji: '🎮' },
  { id: 'animals', name: 'Animals', emoji: '🐘' },
  { id: 'literature', name: 'Literature', emoji: '📚' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎭' },
  { id: 'random', name: 'Random Mix', emoji: '🎲' },
];

export default function RoomLobby() {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(QUIZ_CATEGORIES[0]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        // Sign in anonymously if not already signed in
        signInAnonymously(auth).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const trimmedName = (username || '').trim();
    if (!trimmedName) {
      setError('Please enter a username');
      return;
    }

    if (!user) {
      setError('Please wait while we sign you in...');
      return;
    }
    
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      setIsCreating(true);
      const code = generateRoomCode();
      const roomRef = doc(db, 'rooms', code);
      
      console.log('Creating room with code:', code);
      
      // First create the room without the serverTimestamp in the players array
      const playerData = {
        id: user.uid,
        username: username.trim(),
        score: 0,
        isHost: true,
        isReady: true,
        // We'll update this with serverTimestamp after creating the room
        joinedAt: new Date().toISOString()
      };
      
      const roomData = {
        code,
        hostId: user.uid,
        status: 'waiting',
        // Use an object with the user ID as the key to prevent Firestore array issues
        players: {
          [user.uid]: playerData
        },
        category: selectedCategory.id,
        currentQuestion: null,
        currentQuestionIndex: 0,
        maxPlayers: 10,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log('Room data structure:', JSON.stringify(roomData, null, 2));
      
      console.log('Creating room with data:', JSON.stringify(roomData, null, 2));
      
      try {
        // Create the room with the initial data
        await setDoc(roomRef, roomData, { merge: true });
        console.log('Room created successfully');
        
        // Then update the player's joinedAt with serverTimestamp
        const playerUpdate = {};
        playerUpdate[`players.${user.uid}.joinedAt`] = serverTimestamp();
        
        console.log('Updating player timestamp...');
        await updateDoc(roomRef, playerUpdate);
        console.log('Player timestamp updated');
      } catch (error) {
        console.error('Error creating room:', error);
        throw error;
      }
      
      // Navigate to the room
      const navState = { 
        username: username.trim(), 
        isHost: true,
        userId: user.uid
      };
      
      console.log('Navigating to room with state:', navState);
      navigate(`/room/${code}`, { state: navState });
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async (e) => {
    e && e.preventDefault();
    console.log('=== JOIN ROOM STARTED ===');
    
    if (!roomCode || !username.trim()) {
      const errorMsg = 'Please enter both room code and username';
      console.log('Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!user) {
      const errorMsg = 'Please wait while we sign you in...';
      console.log(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setIsJoining(true);
      const code = roomCode.toUpperCase().trim();
      const roomRef = doc(db, 'rooms', code);
      
      // First, check if the room exists and is joinable
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) {
        setError('Room not found');
        return;
      }

      const roomData = roomDoc.data();
      if (roomData.status !== 'waiting') {
        setError('Game has already started');
        return;
      }

      // Check if room is full
      if (roomData.players && roomData.players.length >= (roomData.maxPlayers || 10)) {
        setError('This room is full');
        return;
      }

      // Ensure players is an array and get current players
      // Ensure players is an object
      const currentPlayers = roomData.players && typeof roomData.players === 'object' 
        ? { ...roomData.players } 
        : {};
      
      // Check if player already exists in the room
      const playerExists = currentPlayers[user.uid];
      
      if (playerExists) {
        console.log('Player already in room, refreshing page state');
      } else {
        // Add the new player
        const playerData = {
          id: user.uid,
          username: username.trim(),
          score: 0,
          isHost: false,
          isReady: false,
          joinedAt: serverTimestamp()
        };
        
        console.log('Adding new player to room:', playerData);
        
        // Update the players object in Firestore
        const updateData = {};
        updateData[`players.${user.uid}`] = playerData;
        updateData.updatedAt = serverTimestamp();
        
        await updateDoc(roomRef, updateData);
      }

      navigate(`/room/${code}`, { 
        state: { 
          username: username.trim(), 
          isHost: false,
          userId: user.uid
        } 
      });
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Multiplayer Quiz</h2>
              
              {/* Create Room Form */}
              <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center">Multiplayer Quiz</h1>
                
                <div className="mb-6">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                  
                  {/* Category Selection */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Category
                    </label>
                    <div 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    >
                      <span>{selectedCategory.emoji} {selectedCategory.name}</span>
                      <FaChevronDown className={`transition-transform duration-200 ${showCategoryDropdown ? 'transform rotate-180' : ''}`} />
                    </div>
                    
                    {showCategoryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {QUIZ_CATEGORIES.map((category) => (
                          <div
                            key={category.id}
                            className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${selectedCategory.id === category.id ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setSelectedCategory(category);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <span className="mr-2">{category.emoji}</span>
                            {category.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-100"
                  disabled={isCreating || isJoining}
                  onClick={(e) => {
                    console.log('Create Room button clicked');
                    e.preventDefault();
                    if (username.trim()) {
                      createRoom(e);
                    } else {
                      setError('Please enter a username');
                    }
                  }}
                >
                  <FaGamepad className="me-2" />
                  {isCreating ? 'Creating Room...' : 'Create New Room'}
                </button>
              </div>

              <div className="text-center my-4">
                <div className="position-relative">
                  <hr />
                  <span className="position-absolute top-50 start-50 translate-middle bg-white px-3">OR</span>
                </div>
              </div>

              {/* Join Room Form */}
              <div className="mt-4">
                <h4 className="text-center mb-3">Join Existing Room</h4>
                <form onSubmit={joinRoom}>
                  <div className="mb-3">
                    <label htmlFor="joinUsername" className="form-label">Your Username</label>
                    <input
                      type="text"
                      id="joinUsername"
                      className="form-control mb-3"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="roomCode" className="form-label">Room Code</label>
                    <input
                      type="text"
                      id="roomCode"
                      className="form-control mb-3 text-uppercase"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter room code"
                      required
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-outline-primary w-100"
                    disabled={isCreating || isJoining}
                  >
                    <FaUserPlus className="me-2" />
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </button>
                </form>
              </div>

              {error && (
                <div className="alert alert-danger mt-3">
                  {error}
                </div>
              )}

              <div className="mt-4 text-center text-muted">
                <FaUsers className="me-2" />
                Play with friends in real-time!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
