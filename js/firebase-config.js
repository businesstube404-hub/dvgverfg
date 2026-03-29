// ================================================================
// Firebase Configuration
// ================================================================
// ⚠️  SETUP REQUIRED:
// 1. Go to https://console.firebase.google.com
// 2. Create a project → Add Web App
// 3. Copy your config below
// 4. Enable Google Sign-In: Authentication → Sign-in method → Google
// 5. Create Firestore database (start in test mode for development)
// 6. In Vercel: add all these values as Environment Variables
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
