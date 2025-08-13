import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const createTestUser = async (email, password, displayName = 'Test User') => {
  try {
    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's profile with display name
    await updateProfile(user, {
      displayName: displayName,
    });

    // Create a user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: displayName,
      email: email,
      photoURL: '',
      createdAt: new Date().toISOString(),
      role: 'user',
      score: 0,
      gamesPlayed: 0,
      correctAnswers: 0,
      totalAnswers: 0
    });

    console.log('Test user created successfully:', user.uid);
    return user;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

// Usage example:
// createTestUser('test@example.com', 'password123', 'Test User')
//   .then(() => console.log('Done'))
//   .catch(console.error);

export default createTestUser;
