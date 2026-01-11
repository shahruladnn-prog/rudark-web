'use server';

import { adminDb } from '@/lib/firebase-admin';
import { PaymentSettings, DEFAULT_PAYMENT_SETTINGS, PaymentGateway } from '@/types/payment-settings';

const SETTINGS_DOC = 'settings/payment';

/**
 * Get current payment settings
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
    try {
        const doc = await adminDb.doc(SETTINGS_DOC).get();

        if (!doc.exists) {
            // Initialize with defaults
            await adminDb.doc(SETTINGS_DOC).set(DEFAULT_PAYMENT_SETTINGS);
            return DEFAULT_PAYMENT_SETTINGS;
        }

        return doc.data() as PaymentSettings;
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        return DEFAULT_PAYMENT_SETTINGS;
    }
}

/**
 * Update payment settings
 */
export async function updatePaymentSettings(settings: Partial<PaymentSettings>) {
    try {
        await adminDb.doc(SETTINGS_DOC).set(settings, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating payment settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}

/**
 * Switch active payment gateway
 */
export async function switchPaymentGateway(gateway: PaymentGateway) {
    try {
        await adminDb.doc(SETTINGS_DOC).update({
            enabled_gateway: gateway
        });
        return { success: true };
    } catch (error) {
        console.error('Error switching gateway:', error);
        return { success: false, error: 'Failed to switch gateway' };
    }
}

/**
 * Toggle CHIP environment (test/live)
 */
export async function toggleChipEnvironment(environment: 'test' | 'live') {
    try {
        await adminDb.doc(SETTINGS_DOC).update({
            'chip.environment': environment
        });
        return { success: true };
    } catch (error) {
        console.error('Error toggling CHIP environment:', error);
        return { success: false, error: 'Failed to toggle environment' };
    }
}

/**
 * Get API key for CHIP based on environment
 */
export async function getChipApiKey(environment: 'test' | 'live'): Promise<string> {
    return environment === 'live'
        ? process.env.CHIP_LIVE_SECRET_KEY!
        : process.env.CHIP_TEST_SECRET_KEY!;
}

/**
 * Get BizAppay API key
 */
export async function getBizappayApiKey(): Promise<string> {
    return process.env.BIZAPP_API_KEY!;
}
