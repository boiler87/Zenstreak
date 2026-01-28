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
// Reverted to standard firebaseapp.com domain for authDomain.
// This is critical for sign-in functionality across all environments.
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
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  setPersistence(auth, browserLocalPersistence).catch((error: any) => {
    console.warn("Firebase Auth Persistence Warning:", error);
  });
  
  console.log("[Firebase] Service started.");
} catch (error) {
  console.error("[Firebase] Critical Initialization Failure:", error);
}

const LOCAL_STORAGE_DATA_KEY = 'zenstreak_data';

// --- Auth Services ---

export const signInWithGoogle = async (): Promise<User> => {
  if (!auth) throw new Error("Authentication service is not initialized.");

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup blocked. Please allow popups for this site.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled by user.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection.");
    }
    
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
    localStorage.removeItem(LOCAL_STORAGE_DATA_KEY);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) {
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

  const localString = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
  let finalData: UserData = localString ? { ...defaultData, ...JSON.parse(localString) } : defaultData;

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as UserData;
        finalData = { ...finalData, ...cloudData };
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(finalData));
      } else {
        await setDoc(docRef, finalData);
      }
    } catch (error) {
      console.error("Firestore Read Error:", error);
    }
  }

  return finalData;
};

export const saveUserData = async (user: User | null, data: UserData): Promise<void> => {
  try {
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage Write Error:", e);
  }

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error("Firestore Write Error:", error);
    }
  }
};

export { auth, db };
