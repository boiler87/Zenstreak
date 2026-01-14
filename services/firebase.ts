import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
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
  User,
  Auth
} from 'firebase/auth';
import { UserData } from '../types';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCcHARUXeN4tCYTh_mQEEBkzeQAKuNxhJk",
  authDomain: "streaker-484317.firebaseapp.com",
  projectId: "streaker-484317",
  storageBucket: "streaker-484317.firebasestorage.app",
  messagingSenderId: "546640202479",
  appId: "1:546640202479:web:970f912ddb088e2720e91a"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isFirebaseInitialized = false;

// Attempt to initialize
try {
  // Handle React Hot Refresh (prevent duplicate app initialization)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseInitialized = true;
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// --- Auth Services ---

export const signInWithGoogle = async (): Promise<User | null> => {
  if (!auth) {
    alert("Firebase initialization failed. Please refresh the page.");
    return null;
  }
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in", error);
    
    // Detailed error handling for common setup issues
    if (error.code === 'auth/configuration-not-found') {
      alert("Configuration Error: Google Sign-In is not enabled in your Firebase Console.\n\nPlease go to Firebase Console > Authentication > Sign-in method and enable the 'Google' provider.");
    } else if (error.code === 'auth/operation-not-allowed') {
       alert("Configuration Error: The provided sign-in provider is disabled for your Firebase project.");
    } else if (error.code === 'auth/unauthorized-domain') {
       alert(`Configuration Error: The current domain (${window.location.hostname}) is not authorized.\n\nPlease go to Firebase Console > Authentication > Settings > Authorized Domains and add: ${window.location.hostname}`);
    } else if (error.code === 'auth/popup-closed-by-user') {
      // User closed popup, ignore
    } else {
      alert(`Sign in failed: ${error.message}`);
    }
    
    return null;
  }
};

// --- Data Services (Hybrid Firebase + LocalStorage) ---

const LOCAL_STORAGE_DATA_KEY = 'zenstreak_data';

export const logout = async () => {
  // Clear local storage data so it doesn't persist for the next 'guest' user
  localStorage.removeItem(LOCAL_STORAGE_DATA_KEY);
  
  if (auth) {
    await signOut(auth);
  }
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
    history: []
  };

  // If no user or no DB, try local storage
  if (!user || !db) {
    const local = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (local) return JSON.parse(local);
    return defaultData;
  }

  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    } else {
      // If doc doesn't exist, try to see if we have local data to migrate
      const local = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
      const initialData = local ? { ...JSON.parse(local), uid: user.uid } : { ...defaultData, uid: user.uid };
      
      await setDoc(docRef, initialData);
      return initialData;
    }
  } catch (e) {
    console.error("Error fetching data", e);
    // Fallback to local if remote fetch fails
    const local = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    return local ? JSON.parse(local) : defaultData;
  }
};

export const saveUserData = async (user: User | null, data: UserData): Promise<void> => {
  // Always save locally as backup/cache
  localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(data));

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
    } catch (e) {
      console.error("Error saving data to Firebase", e);
    }
  }
};

export { isFirebaseInitialized };
