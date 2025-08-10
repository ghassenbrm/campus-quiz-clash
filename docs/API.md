# API Documentation

This document describes the data structures and API endpoints used in the Campus Quiz Clash application.

## Data Structures

### User
```typescript
interface User {
  uid: string;              // Firebase Auth UID
  email: string;            // User's email
  displayName?: string;     // User's display name
  photoURL?: string;        // URL to user's profile picture
  role: 'student' | 'admin'; // User role
  university: string;       // University name
  classroom: string;        // Classroom/group name
  score: number;            // Total score
  createdAt: Date;          // Account creation date
  lastLogin: Date;          // Last login timestamp
}
```

### Question
```typescript
interface Question {
  id: string;              // Document ID
  text: string;            // Question text
  choices: string[];       // Array of answer choices
  answer: number;          // Index of correct answer
  category: string;        // Question category
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;         // When the question was created
  createdBy: string;       // UID of creator
}
```

### Quiz Result
```typescript
interface QuizResult {
  id: string;              // Document ID
  userId: string;          // User UID
  score: number;           // Points earned
  correct: number;         // Number of correct answers
  total: number;           // Total number of questions
  timeSpent: number;       // Time taken in seconds
  date: string;            // Date of the quiz (YYYY-MM-DD)
  timestamp: Date;         // Exact timestamp
  answers: {
    questionId: string;    // Reference to question
    selected: number;      // Index of selected answer
    correct: boolean;      // Whether answer was correct
    timeSpent: number;     // Time spent on this question
  }[];
}
```

## Firestore Collections

### Users
- **Path**: `/users/{userId}`
- **Security Rules**:
  - Read: Authenticated users can read any user
  - Write: Users can update their own profile, admins can update any

### Questions
- **Path**: `/questions/{questionId}`
- **Security Rules**:
  - Read: Authenticated users
  - Write: Admins only

### Leaderboards
- **Path**: `/leaderboards/{date}`
- **Security Rules**:
  - Read: Authenticated users
  - Write: Server-side only

### MVP
- **Path**: `/mvp/current`
- **Security Rules**:
  - Read: Authenticated users
  - Write: Server-side only

## API Endpoints

### Authentication

#### Sign Up
```typescript
// Client-side
import { createUserWithEmailAndPassword } from "firebase/auth";

const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  password
);
```

#### Sign In
```typescript
// Client-side
import { signInWithEmailAndPassword } from "firebase/auth";

const userCredential = await signInWithEmailAndPassword(
  auth,
  email,
  password
);
```

### Questions

#### Get All Questions
```typescript
// Client-side
import { collection, getDocs } from "firebase/firestore";

const querySnapshot = await getDocs(collection(db, "questions"));
const questions = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

#### Add Question (Admin Only)
```typescript
// Client-side
import { addDoc, collection } from "firebase/firestore";

const question = {
  text: "What is 2+2?",
  choices: ["3", "4", "5", "6"],
  answer: 1,
  category: "math",
  difficulty: "easy",
  createdAt: new Date(),
  createdBy: currentUser.uid
};

const docRef = await addDoc(collection(db, "questions"), question);
```

### Leaderboard

#### Get Daily Leaderboard
```typescript
// Client-side
import { collection, query, where, orderBy, limit } from "firebase/firestore";

const today = new Date().toISOString().split('T')[0];
const q = query(
  collection(db, "leaderboards"),
  where("date", "==", today),
  orderBy("score", "desc"),
  limit(10)
);

const querySnapshot = await getDocs(q);
const leaderboard = querySnapshot.docs.map(doc => doc.data());
```

## Real-time Updates

### Subscribe to Leaderboard Updates
```typescript
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

const today = new Date().toISOString().split('T')[0];
const q = query(
  collection(db, "leaderboards"),
  where("date", "==", today),
  orderBy("score", "desc")
);

const unsubscribe = onSnapshot(q, (querySnapshot) => {
  const leaderboard = [];
  querySnapshot.forEach((doc) => {
    leaderboard.push({ id: doc.id, ...doc.data() });
  });
  // Update your UI
});

// Call unsubscribe() when component unmounts
```

## Error Handling

All API calls should be wrapped in try-catch blocks to handle potential errors:

```typescript
try {
  const result = await someFirestoreOperation();
  // Handle success
} catch (error) {
  console.error("Error:", error);
  // Show user-friendly error message
}
```

## Rate Limiting

- Authentication: 10 requests per minute per user
- Firestore: 20,000 reads per day (free tier)
- Consider implementing client-side caching for frequently accessed data
