// ================================================================
// Authentication & User Management (Firebase)
// ================================================================

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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
export const getCurrentPlan     = () => _currentUserData?.subscriptionType ?? (_currentUserData?.plan === 'premium' ? 'VIP' : 'FREE');
export const hasPremiumAccess   = (userData = _currentUserData) => userData?.plan === 'premium' || userData?.role === 'admin' || ['VIP', 'VVIP', 'ADMIN'].includes(userData?.subscriptionType);

// ── Google Sign-In ────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account', hl: 'ar' });
  provider.addScope('email');
  provider.addScope('profile');
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Google sign-in failed:', err.code, err.message);

    // Fallback for browsers that block popups or have strict privacy settings.
    const fallbackCodes = new Set([
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ]);

    if (fallbackCodes.has(err.code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw err;
  }
}

// ── Sign-Out ──────────────────────────────────────────────────
export async function signOutUser() {
  await signOut(auth);
  _currentUser     = null;
  _currentUserData = null;
}

// ── Helpers ──────────────────────────────────────────────────
function normalizeUserData(data = {}, firebaseUser = null) {
  const subscriptionType = data.subscriptionType ?? (data.role === 'admin' ? 'VVIP' : data.plan === 'premium' ? 'VIP' : 'FREE');
  const plan = data.plan ?? (subscriptionType === 'FREE' ? 'free' : 'premium');
  const role = data.role ?? (subscriptionType === 'VVIP' ? 'admin' : 'user');

  return {
    ...data,
    uid: data.uid ?? firebaseUser?.uid ?? null,
    email: data.email ?? firebaseUser?.email ?? null,
    displayName: data.displayName ?? firebaseUser?.displayName ?? null,
    photoURL: data.photoURL ?? firebaseUser?.photoURL ?? null,
    plan,
    role,
    subscriptionType,
  };
}

// ── Firestore: Save New User or Load Existing ─────────────────
async function syncUserWithFirestore(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap    = await getDoc(userRef);

  if (!snap.exists()) {
    // New user → create with FREE plan
    const newUser = normalizeUserData({
      uid:              firebaseUser.uid,
      email:            firebaseUser.email,
      displayName:      firebaseUser.displayName,
      photoURL:         firebaseUser.photoURL,
      plan:             'free',
      role:             'user',
      subscriptionType: 'FREE',
      createdAt:        serverTimestamp(),
    }, firebaseUser);
    await setDoc(userRef, newUser);
    return newUser;
  }

  const normalized = normalizeUserData(snap.data(), firebaseUser);
  const needsBackfill = !snap.data().plan || !snap.data().role || !snap.data().subscriptionType;
  if (needsBackfill) {
    await setDoc(userRef, {
      plan: normalized.plan,
      role: normalized.role,
      subscriptionType: normalized.subscriptionType,
      email: normalized.email,
      displayName: normalized.displayName,
      photoURL: normalized.photoURL,
    }, { merge: true });
  }
  return normalized;
}

export async function refreshCurrentUserData() {
  if (!_currentUser) return null;
  _currentUserData = await syncUserWithFirestore(_currentUser);
  return _currentUserData;
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
          plan:             'free',
          role:             'user',
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
