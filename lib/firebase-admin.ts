import * as admin from 'firebase-admin';
import { join } from 'path';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
    try {
        // Assume serviceAccountKey.json is in the root of the project (or wherever this runs)
        // In Next.js, process.cwd() is usually the project root.
        const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');

        let serviceAccount;
        try {
            const fileContent = readFileSync(serviceAccountPath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
        } catch (e) {
            console.warn('serviceAccountKey.json not found or invalid at ' + serviceAccountPath);
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized with serviceAccountKey.json");
        } else {
            // Fallback to env vars if file missing (optional, mostly for legacy support)
            if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    }),
                });
            } else {
                console.warn("No Firebase Admin credentials found.");
            }
        }

    } catch (error) {
        console.error('FIREBASE INIT ERROR:', error);
    }
}

console.log(`[Firebase Admin] Apps: ${admin.apps.length}, ProjectId Env: ${process.env.FIREBASE_ADMIN_PROJECT_ID ? 'Set' : 'Missing'}`);

// Export adminDb safely. 
// If admin app is not initialized (e.g. during build without keys), 
// accessing adminDb functions will throw, which is expected at runtime 
// but prevents module-level crash.
let adminDb: admin.firestore.Firestore;

try {
    if (admin.apps.length) {
        adminDb = admin.firestore();
    } else {
        // Create a proxy or empty object that satisfies type CHECKING vs Runtime
        // This prevents "The default Firebase app does not exist" from throwing IMMEDIATELY on import
        adminDb = {} as admin.firestore.Firestore;
    }
} catch (e) {
    adminDb = {} as admin.firestore.Firestore;
}

export { adminDb };
