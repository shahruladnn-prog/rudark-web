'use server';

import { adminDb } from '@/lib/firebase-admin';
const { authenticator } = require('otplib');
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

function getEncryptionKey(): Buffer {
    const hex = process.env.TOTP_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            'TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
            'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(hex, 'hex');
}

function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid TOTP secret format — please disable and re-enable 2FA');
    }
    const [ivHex, tagHex, encHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

export async function generateTotpSecret(uid: string) {
    try {
        const userDoc = await adminDb.collection('admin_users').doc(uid).get();
        if (!userDoc.exists) throw new Error('User not found');

        const userData = userDoc.data()!;
        const email = userData.email;

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(email, "Rud'Ark Command Center", secret);
        const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

        await adminDb.collection('admin_users').doc(uid).update({
            totp_secret: encrypt(secret),
            totp_enabled: false
        });

        return { success: true, secret, otpauthUrl, qrDataUrl };
    } catch (error: any) {
        console.error('[generateTotpSecret] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function verifyTotp(uid: string, token: string) {
    try {
        const userDoc = await adminDb.collection('admin_users').doc(uid).get();
        if (!userDoc.exists) return false;
        const userData = userDoc.data()!;
        if (!userData.totp_secret) return false;

        const secret = decrypt(userData.totp_secret);
        return authenticator.verify({ token, secret });
    } catch (error) {
        console.error('[verifyTotp] Error:', error);
        return false;
    }
}

export async function enableTotp(uid: string) {
    try {
        await adminDb.collection('admin_users').doc(uid).update({
            totp_enabled: true
        });
        return { success: true };
    } catch (error: any) {
        console.error('[enableTotp] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function checkTotpEnabled(uid: string) {
    try {
        const doc = await adminDb.collection('admin_users').doc(uid).get();
        return doc.exists && doc.data()?.totp_enabled === true;
    } catch {
        return false;
    }
}