'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { PaymentSettings, DEFAULT_PAYMENT_SETTINGS, PaymentGateway } from '@/types/payment-settings';
import { loyverse } from '@/lib/loyverse';

const SETTINGS_DOC = 'settings/payment';

/**
 * Sync available payment types from Loyverse to our settings
 */
export async function syncLoyversePaymentTypes() {
    await requireRole(['owner']);

    try {
        const data = await loyverse.getPaymentTypes();
        const lvTypes = data.payment_types || [];
        
        // Fetch current settings
        const doc = await adminDb.doc(SETTINGS_DOC).get();
        const current = doc.exists ? doc.data() as PaymentSettings : DEFAULT_PAYMENT_SETTINGS;
        
        const newMappings = { ...(current.loyverse_mappings || {}) };
        
        // Add any new types from Loyverse that we don't have yet
        lvTypes.forEach((t: any) => {
            if (!newMappings[t.id]) {
                newMappings[t.id] = t.name;
            }
        });

        await adminDb.doc(SETTINGS_DOC).set({
            loyverse_mappings: newMappings
        }, { merge: true });

        return { success: true, count: lvTypes.length };
    } catch (error: any) {
        console.error('Error syncing Loyverse payment types:', error);
        return { success: false, error: error.message };
    }
}

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
    await requireRole(['owner']);

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
    await requireRole(['owner']);

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
 * Get CHIP live API key
 */
export async function getChipApiKey(): Promise<string> {
    return process.env.CHIP_LIVE_SECRET_KEY!;
}

/**
 * Get Public Key for CHIP signature verification
 * Returns undefined if not set (which will cause verification to fail safely)
 */
export async function getChipPublicKey(): Promise<string | undefined> {
    // In a real app, this should probably be in Firestore settings or Env Var
    // For now, checking Env Var first
    return process.env.CHIP_PUBLIC_KEY;
}

/**
 * Get BizAppay API key
 */
export async function getBizappayApiKey(): Promise<string> {
    await requireRole(['owner']);

    return process.env.BIZAPP_API_KEY!;
}

/**
 * Get simple list of active payment methods for POS UI
 */
export async function getPOSPaymentMethods() {
    try {
        const settings = await getPaymentSettings();
        const mappings = settings.loyverse_mappings || {};
        
        // If no mappings, provide defaults
        if (Object.keys(mappings).length === 0) {
            return [
                { id: 'CASH', label: 'Cash' },
                { id: 'CARD', label: 'Card' },
                { id: 'OTHER', label: 'QR Pay / Transfer' }
            ];
        }

        return Object.entries(mappings).map(([id, label]) => ({
            id,
            label: label as string
        }));
    } catch {
        return [{ id: 'CASH', label: 'Cash' }];
    }
}
