import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User, Auth } from 'firebase/auth';
import { UserData } from '../types';

// Explicit configuration - this will be used regardless of environment
const firebaseConfig = {
  apiKey: "AIzaSyDygmVHR9CQaC-00NZHFcWxQh1Gw6-N0eg",
  authDomain: "gen-lang-client-0839635573.firebaseapp.com",
  projectId: "gen-lang-client-0839635573",
  storageBucket: "gen-lang-client-0839635573.firebasestorage.app",
  messagingSenderId: "216942724738",
  appId: "1:216942724738:web:27a67f70516624fc4a969b"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isFirebaseInitialized = false;

// Debug: Log the key being used (partial)
console.log("Initializing Firebase with Key ending in:", firebaseConfig.apiKey.slice(-4));
// Debug: Log the hostname to help with authorized domain issues
console.log("Current Hostname (Add this to Firebase Console > Auth > Settings > Authorized Domains):", window.location.hostname);

try {
  const APP_NAME = 'streaker-client-app';
  
  // Check if our specific app is already initialized
  const existingApp = getApps().find(a => a.name === APP_NAME);
  
  if (existingApp) {
    app = existingApp;
  } else {
    app = initializeApp(firebaseConfig, APP_NAME);
  }

  // Initialize Auth with persistence
  auth = getAuth(app);
  
  // Ensure persistence is set to local
  setPersistence(auth, browserLocalPersistence).catch(err => 
    console.error("Persistence setup failed:", err)
  );

  db = getFirestore(app);
  isFirebaseInitialized = true;
} catch (error) {
  console.error("Firebase initialization critical error:", error);
}

const LOCAL_STORAGE_DATA_KEY = 'zenstreak_data';

export const signInWithGoogle = async (): Promise<void> => {
  if (!auth) {
    throw new Error("Firebase Auth not initialized");
  }
  const provider = new GoogleAuthProvider();
  // Force account selection to avoid auto-login issues
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign in failed", error);
    throw error;
  }
};

export const logout = async () => {
  if (auth) await signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

export const getUserData = async (user: User | null): Promise<UserData> => {
  const defaultData: UserData = {
    currentStreakStart: Date.now(),
    goal: 30,
    history: [],
    showMotivation: true,
    totalEvents: 0
  };

  const local = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
  let finalData = local ? { ...defaultData, ...JSON.parse(local) } : defaultData;

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        finalData = { ...finalData, ...docSnap.data() } as UserData;
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(finalData));
      } else {
        await setDoc(docRef, finalData);
      }
    } catch (e) {
      console.error("Error fetching remote data", e);
    }
  }

  return finalData;
};

export const saveUserData = async (user: User | null, data: UserData): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      console.error("Error saving to cloud", e);
    }
  }
};

export { isFirebaseInitialized };