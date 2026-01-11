'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function testDatabaseConnection() {
    const timestamp = new Date().toISOString();
    const testRef = adminDb.collection('_debug_test').doc('connectivity_check');

    console.log(`[DB TEST] Starting Test. Timestamp: ${timestamp}`);
    // console.log(`[DB TEST] Project ID: ${adminDb.app.options.projectId}`); // Unsafe access removed

    try {
        // 1. Write
        console.log("[DB TEST] Attempting Write...");
        await testRef.set({
            status: 'online',
            last_checked: timestamp,
            write_verified: true
        });
        console.log("[DB TEST] Write Success.");

        // 2. Read
        console.log("[DB TEST] Attempting Read...");
        const doc = await testRef.get();

        if (doc.exists) {
            console.log("[DB TEST] Read Success. Data:", doc.data());
            return { success: true, message: 'Write and Read successful', data: doc.data() };
        } else {
            console.error("[DB TEST] Read Failed. Document not found after write.");
            return { success: false, error: 'Document not found after write' };
        }

    } catch (error: any) {
        console.error("[DB TEST] Error:", error);
        return { success: false, error: error.message };
    }
}
