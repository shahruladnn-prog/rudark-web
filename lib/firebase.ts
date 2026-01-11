import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Config
const isConfigValid = !!firebaseConfig.apiKey;

// Initialize Firebase (Singleton pattern)
let app: any = null;
let db: any = null;
let storage: any = null;
let functions: any = null;
let initError: string | null = null;

if (!isConfigValid) {
    initError = "Missing Firebase Configuration. Check .env.local";
}

if (isConfigValid) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        storage = getStorage(app);
        functions = getFunctions(app, 'us-central1'); // Ensure region matches
    } catch (error: any) {
        console.error("Firebase Init Error:", error);
        initError = error.message || "Unknown Firebase initialization error";
    }
}

export { app, db, storage, functions, initError };
