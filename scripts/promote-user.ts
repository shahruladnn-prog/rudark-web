import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { adminAuth, adminDb } from '../lib/firebase-admin';

async function promote(email: string) {
    if (!email) {
        console.error("❌ Please provide an email address.");
        process.exit(1);
    }

    try {
        console.log(`🔍 Searching for user: ${email}...`);
        const user = await adminAuth.getUserByEmail(email);
        
        console.log(`✅ User found (UID: ${user.uid}). Promoting to OWNER...`);
        
        await adminDb.collection('admin_users').doc(user.uid).set({
            email: user.email,
            role: 'owner',
            created_at: new Date().toISOString()
        }, { merge: true });

        console.log(`🚀 SUCCESS! ${email} is now an OWNER.`);
        console.log(`✨ You can now log in at /login and access /admin.`);
        process.exit(0);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ Error: No user found with email ${email}. Please register first on the login page.`);
        } else {
            console.error("❌ Error:", error.message);
        }
        process.exit(1);
    }
}

const email = process.argv[2];
promote(email);
