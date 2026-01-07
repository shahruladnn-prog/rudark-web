import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
            console.log("[Firebase Admin] Initialized via Environment Variables");
        } else {
            console.warn("[Firebase Admin] No credentials found in Environment Variables.");
        }
    } catch (error) {
        console.error('FIREBASE INIT ERROR:', error);
    }
}

// Export adminDb safely. 
let adminDb: admin.firestore.Firestore;

try {
    if (admin.apps.length) {
        adminDb = admin.firestore();
    } else {
        adminDb = {} as admin.firestore.Firestore;
    }
} catch (e) {
    adminDb = {} as admin.firestore.Firestore;
}

export { adminDb };
