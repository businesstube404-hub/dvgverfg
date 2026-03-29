// ================================================================
// Authentication & User Management (Firebase)
// ================================================================

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Shared state
let _currentUser     = null;
let _currentUserData = null;

export const getCurrentUser     = () => _currentUser;
export const getCurrentUserData = () => _currentUserData;
export const getCurrentPlan     = () => _currentUserData?.subscriptionType ?? 'FREE';

// ── Google Sign-In ────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Google sign-in failed:', err.code, err.message);
    throw err;
  }
}

// ── Sign-Out ──────────────────────────────────────────────────
export async function signOutUser() {
  await signOut(auth);
  _currentUser     = null;
  _currentUserData = null;
}

// ── Firestore: Save New User or Load Existing ─────────────────
async function syncUserWithFirestore(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap    = await getDoc(userRef);

  if (!snap.exists()) {
    // New user → create with FREE plan
    const newUser = {
      uid:              firebaseUser.uid,
      email:            firebaseUser.email,
      displayName:      firebaseUser.displayName,
      photoURL:         firebaseUser.photoURL,
      subscriptionType: 'FREE',
      createdAt:        serverTimestamp(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }

  return snap.data();
}

// ── Auth State Listener ───────────────────────────────────────
/**
 * @param {Function} callback - called with (firebaseUser | null, userData | null)
 */
export function onAuthChange(callback) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        _currentUser     = firebaseUser;
        _currentUserData = await syncUserWithFirestore(firebaseUser);
      } catch (err) {
        console.error('Firestore sync failed:', err);
        // Fallback so the app still works even if Firestore is misconfigured
        _currentUserData = {
          uid:              firebaseUser.uid,
          email:            firebaseUser.email,
          displayName:      firebaseUser.displayName,
          photoURL:         firebaseUser.photoURL,
          subscriptionType: 'FREE',
        };
      }
      callback(_currentUser, _currentUserData);
    } else {
      _currentUser     = null;
      _currentUserData = null;
      callback(null, null);
    }
  });
}
