import * as admin from 'firebase-admin';

// Prevent multiple initializations in development
const globalWithFirebase = global as typeof globalThis & {
    firebaseAdminApp?: admin.app.App;
    adminDb?: admin.firestore.Firestore;
};

if (!globalWithFirebase.firebaseAdminApp) {
    if (!admin.apps.length) {
        try {
            if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
                globalWithFirebase.firebaseAdminApp = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    }),
                });
                console.log("[Firebase Admin] Initialized via Environment Variables");
            } else if (process.env.FIRESTORE_EMULATOR_HOST) {
                // Emulator Mode
                globalWithFirebase.firebaseAdminApp = admin.initializeApp({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'
                });
                console.log("[Firebase Admin] Initialized in EMULATOR Mode");
            } else {
                // Try Application Default Credentials (ADC)
                console.log("[Firebase Admin] Attempting to use Application Default Credentials...");
                globalWithFirebase.firebaseAdminApp = admin.initializeApp({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID
                });
                console.log("[Firebase Admin] Initialized via ADC.");
            }
        } catch (error) {
            console.error('FIREBASE INIT ERROR:', error);
            throw error;
        }
    } else {
        globalWithFirebase.firebaseAdminApp = admin.app();
    }
}

if (!globalWithFirebase.adminDb) {
    if (globalWithFirebase.firebaseAdminApp) {
        globalWithFirebase.adminDb = globalWithFirebase.firebaseAdminApp.firestore();
        console.log("[Firebase Admin] Firestore instance created.");
    } else {
        // Fallback if something went wrong
        globalWithFirebase.adminDb = admin.firestore();
    }
}

const adminDb = globalWithFirebase.adminDb!;
const isFirebaseAdminMock = false;

export { adminDb, isFirebaseAdminMock };
