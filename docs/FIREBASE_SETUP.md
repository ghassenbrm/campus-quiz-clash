# Firebase Setup Guide

This guide will walk you through setting up Firebase for the Campus Quiz Clash application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Campus Quiz Clash")
4. Follow the setup wizard (you can disable Google Analytics if not needed)

## 2. Set up Authentication

1. In the Firebase Console, go to "Authentication" > "Sign-in method"
2. Enable "Email/Password" authentication
3. (Optional) Set up any additional authentication providers if needed

## 3. Set up Firestore Database

1. Go to "Firestore Database" in the Firebase Console
2. Click "Create database"
3. Start in production mode
4. Choose a location closest to your users
5. Click "Enable"

## 4. Set up Storage (if needed)

1. Go to "Storage" in the Firebase Console
2. Click "Get started"
3. Start in production mode
4. Click "Done"

## 5. Get Firebase Configuration

1. Go to Project settings (gear icon) > General
2. Under "Your apps", click the web icon (</>)
3. Register your app with a nickname (e.g., "Campus Quiz Clash Web")
4. Copy the Firebase configuration object
5. Update your `.env.local` file with these values

## 6. Deploy Security Rules

1. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select Firestore and Hosting
   - Choose your Firebase project
   - Use the default settings for the rest

4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## 7. Set up Indexes

1. Deploy the Firestore indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## 8. Set up Hosting (Optional)

1. Build your app:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## 9. Set up Environment Variables

Create a `.env.local` file in your project root with the following content:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 10. Test Your Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try to create a new user account
3. Verify that data is being saved to Firestore
4. Check the browser console for any errors

## Troubleshooting

- If you get permission denied errors, make sure your security rules are properly deployed
- Check the Firebase Console for any error messages
- Make sure your environment variables are correctly set in `.env.local`
- Verify that your Firebase project has billing enabled (required for Firestore)
