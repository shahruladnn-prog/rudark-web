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

// Mock Firestore to prevent crashes on method chaining
const mockFirestore = {
    collection: (_name: string) => ({
        doc: (_id: string) => ({
            get: async () => ({ exists: false, data: () => undefined }),
            set: async () => ({}),
            update: async () => ({}),
            delete: async () => ({}),
        }),
        where: () => ({
            limit: () => ({ get: async () => ({ docs: [] }) }),
            get: async () => ({ docs: [] })
        }),
        orderBy: () => ({
            limit: () => ({ get: async () => ({ docs: [] }) }),
            get: async () => ({ docs: [] })
        }),
        add: async () => ({ id: 'mock-id' }),
        get: async () => ({ docs: [] }),
    }),
} as unknown as admin.firestore.Firestore;

try {
    if (admin.apps.length) {
        adminDb = admin.firestore();
        // Test connection (optional, but good for verification)
        console.log("[Firebase Admin] Firestore instance created.");
    } else {
        console.warn("[Firebase Admin] Using MOCK Firestore (No Apps Initialized)");
        adminDb = mockFirestore;
    }
} catch (e) {
    console.error("[Firebase Admin] Failed to create Firestore instance, using Mock:", e);
    adminDb = mockFirestore;
}

export { adminDb };
