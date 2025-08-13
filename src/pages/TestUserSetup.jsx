import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import createTestUser from '../utils/createTestUser';

const TestUserSetup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Email and password are required');
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      // Create the test user
      await createTestUser(email, password, displayName || 'Test User');
      setMessage('User created successfully! Logging in...');
      
      // Sign in the newly created user
      await signInWithEmailAndPassword(auth, email, password);
      
      // Redirect to home after successful login
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'An error occurred');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Create Test User</h2>
              
              {message && (
                <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`}>
                  {message}
                </div>
              )}
              
              <form onSubmit={handleCreateUser}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@example.com"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password (min 6 characters)</label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    minLength="6"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="displayName" className="form-label">Display Name (optional)</label>
                  <input
                    type="text"
                    id="displayName"
                    className="form-control"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Test User"
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Creating User...' : 'Create Test User'}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <p className="mb-0">
                  <button 
                    className="btn btn-link p-0"
                    onClick={() => navigate('/login')}
                  >
                    Already have an account? Login here
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestUserSetup;
