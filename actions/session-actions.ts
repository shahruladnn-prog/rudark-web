'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { AdminRole } from '@/types';

export async function createSession(idToken: string) {
    try {
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        
        const cookieStore = await cookies();
        cookieStore.set('__session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });
        
        return { success: true };
    } catch (error) {
        console.error('Session creation failed', error);
        return { success: false };
    }
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete('__session');
    return { success: true };
}

export async function verifySession(): Promise<boolean> {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) return false;
    
    try {
        await adminAuth.verifySessionCookie(session, true);
        return true;
    } catch (error) {
        return false;
    }
}

export async function requireAdmin() {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized - Please log in');
    
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(session, true);
        const doc = await adminDb.collection('admin_users').doc(decodedClaims.uid).get();
        if (!doc.exists) throw new Error('Unauthorized - Not an admin');
        return { uid: decodedClaims.uid, role: doc.data()?.role };
    } catch (error: any) {
        throw new Error(`Unauthorized - ${error.message}`);
    }
}

export async function requireRole(allowed: AdminRole[]): Promise<{ uid: string; role: AdminRole }> {
    const { uid, role } = await requireAdmin();
    if (!role || !allowed.includes(role)) {
        throw new Error('Forbidden — insufficient role');
    }
    return { uid, role: role as AdminRole };
}
