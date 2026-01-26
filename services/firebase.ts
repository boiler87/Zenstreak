
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  Firestore
} from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import { UserData } from '../types';

// Workaround for missing type definitions/exports in the current environment
const authModule = firebaseAuth as any;
const {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} = authModule;

// Define types as any to bypass "Module has no exported member" errors
export type Auth = any;
export type User = any;

// Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDygmVHR9CQaC-00NZHFcWxQh1Gw6-N0eg",
  authDomain: "gen-lang-client-0839635573.firebaseapp.com",
  projectId: "gen-lang-client-0839635573",
  storageBucket: "gen-lang-client-0839635573.firebasestorage.app",
  messagingSenderId: "216942724738",
  appId: "1:216942724738:web:27a67f70516624fc4a969b"
};

// Singleton Initialization
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  // Check if firebase is already initialized to prevent multiple instances
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Set persistence immediately
  setPersistence(auth, browserLocalPersistence).catch((error: any) => {
    console.warn("Firebase Auth Persistence Warning:", error);
  });
  
  console.log("Firebase Initialized Successfully");
} catch (error) {
  console.error("CRITICAL: Firebase Initialization Failed", error);
  throw error; // Re-throw to be caught by global handlers if necessary
}

const LOCAL_STORAGE_DATA_KEY = 'zenstreak_data';

// --- Auth Services ---

export const signInWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error("Authentication service is not initialized.");

  const provider = new GoogleAuthProvider();
  // Forces account selection to prevent auto-login to wrong account
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    
    // Transform error codes into user-friendly messages
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup blocked. Please allow popups for this site.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled by user.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`Domain not authorized. Add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized Domains.`);
    }
    
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
    // Clear local cache on logout to prevent data leaks
    localStorage.removeItem(LOCAL_STORAGE_DATA_KEY);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) {
    console.warn("Auth not initialized, returning null user immediately.");
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// --- Data Services ---

export const getUserData = async (user: User | null): Promise<UserData> => {
  const defaultData: UserData = {
    currentStreakStart: Date.now(),
    goal: 30,
    history: [],
    showMotivation: true,
    totalEvents: 0,
    username: ''
  };

  // 1. Load from LocalStorage (Fastest)
  const localString = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
  let finalData: UserData = localString ? { ...defaultData, ...JSON.parse(localString) } : defaultData;

  // 2. If User is logged in, sync with Cloud (Source of Truth)
  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as UserData;
        
        // Basic conflict resolution: Cloud wins if it exists, but we merge to be safe
        // You might want more complex resolution logic here (e.g., timestamps)
        finalData = { ...finalData, ...cloudData };
        
        // Update local storage to match cloud
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(finalData));
      } else {
        // First time user in cloud? Create their doc with current local data
        await setDoc(docRef, finalData);
      }
    } catch (error) {
      console.error("Firestore Read Error:", error);
      // Fallback to local data is automatic since finalData is already set
    }
  }

  return finalData;
};

export const saveUserData = async (user: User | null, data: UserData): Promise<void> => {
  // 1. Save Local (Optimistic UI)
  try {
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage Write Error:", e);
  }

  // 2. Sync to Cloud if logged in
  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      // Use merge: true to avoid overwriting fields we might not know about
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error("Firestore Write Error:", error);
      // Data is saved locally, so we don't throw blocking error to UI
    }
  }
};

export { auth, db };
