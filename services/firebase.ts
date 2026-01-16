
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
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
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User, Auth } from 'firebase/auth';
import { UserData } from '../types';

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

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Set persistence to local (keeps user logged in across refreshes)
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => console.error("Firebase persistence error:", error));

  // Check for redirect result (needed for mobile sign-in flow)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        console.log("User signed in via redirect");
      }
    })
    .catch((error) => {
      console.error("Firebase redirect login error:", error);
    });

  isFirebaseInitialized = true;
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const LOCAL_STORAGE_DATA_KEY = 'streaker_data';

export const signInWithGoogle = async (): Promise<User | null> => {
  if (!auth) throw new Error("Authentication not initialized");
  
  const provider = new GoogleAuthProvider();

  try {
    // Try popup first (better for desktop)
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Popup sign-in error:", error);
    
    // If popup is blocked or fails (common on mobile), try redirect
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        console.log("Falling back to redirect sign-in...");
        await signInWithRedirect(auth, provider);
        // Does not return, page will reload
        return null;
      } catch (redirectError) {
        console.error("Redirect sign-in error:", redirectError);
        throw redirectError;
      }
    }
    
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
    showMotivation: true
  };

  // Check local first for immediate response
  const local = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
  let finalData = local ? { ...defaultData, ...JSON.parse(local) } : defaultData;

  if (user && db) {
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        finalData = { ...finalData, ...docSnap.data() } as UserData;
        // Sync local with cloud
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(finalData));
      } else {
        // First time login - upload local data to cloud
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
