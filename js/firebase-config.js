// ================================================================
// Firebase Configuration
// ================================================================
// Firebase project values for ToQuiz.
// Make sure Google Sign-In is enabled in Firebase Authentication.
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyB-kuN9ZuL420J-JHdrtNZM-IJS5w2BErU',
  authDomain:        'toquiz-52b01.firebaseapp.com',
  projectId:         'toquiz-52b01',
  storageBucket:     'toquiz-52b01.firebasestorage.app',
  messagingSenderId: '245711786110',
  appId:              '1:245711786110:web:76cb9cd57ab2855c26082f',
  measurementId:     'G-N000S8M3QB',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
