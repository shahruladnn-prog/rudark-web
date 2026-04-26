'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function subscribeEmail(email: string, source: string) {
    if (!email || !email.includes('@')) {
        return { success: false, error: 'Invalid email address' };
    }

    try {
        const subscribersRef = adminDb.collection('subscribers');
        
        // Check for duplicate
        const duplicateCheck = await subscribersRef.where('email', '==', email.toLowerCase()).get();
        
        if (!duplicateCheck.empty) {
            return { 
                success: true, 
                message: 'You are already subscribed!',
                code: 'WELCOME10' // Return the code anyway for existing subscribers
            };
        }

        const promoCode = 'WELCOME10';
        
        await subscribersRef.add({
            email: email.toLowerCase(),
            subscribed_at: new Date().toISOString(),
            discount_code: promoCode,
            source: source
        });

        return { 
            success: true, 
            message: 'Thank you for subscribing!',
            code: promoCode 
        };
    } catch (error) {
        console.error('Subscription error:', error);
        return { success: false, error: 'Failed to subscribe. Please try again.' };
    }
}
