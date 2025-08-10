# Deployment Guide

This guide will help you deploy the Campus Quiz Clash application to production.

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project set up (see [Firebase Setup Guide](FIREBASE_SETUP.md))

## 1. Build the Application

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Build the production version:
   ```bash
   npm run build
   # or
   yarn build
   ```
   This will create a `dist` directory with the production build.

## 2. Configure Firebase Hosting

1. Log in to Firebase:
   ```bash
   firebase login
   ```

2. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select `Hosting` and `Firestore`
   - Choose your Firebase project
   - Set the public directory to `dist`
   - Configure as a single-page app: `Yes`
   - Set up automatic builds: `No`

## 3. Configure Environment Variables

1. Create a `.env.production` file in your project root with your production Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_production_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

2. Update your build script in `package.json` to use the production environment:
   ```json
   "scripts": {
     "build": "vite build --mode production"
   }
   ```

## 4. Deploy to Firebase

1. Deploy your application:
   ```bash
   firebase deploy
   ```
   This will deploy both the hosting and Firestore rules.

2. Your app should now be live at: `https://your-project-id.web.app`

## 5. Set Up Custom Domain (Optional)

1. In the Firebase Console, go to Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify domain ownership
4. Update your DNS settings as instructed

## 6. Set Up Continuous Deployment (Optional)

### Using GitHub Actions

1. Create a `.github/workflows/firebase-hosting-merge.yml` file:
   ```yaml
   name: Deploy to Firebase Hosting on merge
   on:
     push:
       branches: [main]
   jobs:
     build_and_deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: npm ci && npm run build
         - uses: FirebaseExtended/action-hosting-deploy@v0
           with:
             repoToken: '${{ secrets.GITHUB_TOKEN }}'
             firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
             channelId: live
             projectId: your-project-id
   ```

2. Add your Firebase service account key as a GitHub secret:
   - In the Firebase Console, go to Project settings > Service accounts
   - Click "Generate new private key"
   - In your GitHub repository, go to Settings > Secrets > Actions
   - Add a new secret named `FIREBASE_SERVICE_ACCOUNT` with the contents of the JSON file

## 7. Post-Deployment Tasks

1. Set up monitoring in the Firebase Console
2. Configure alerts for errors and performance issues
3. Set up backup schedules for Firestore

## Troubleshooting

- If you get a blank page, check the browser console for errors
- Verify that all environment variables are set correctly
- Check Firebase Console logs for deployment errors
- Ensure your Firestore security rules are properly configured
