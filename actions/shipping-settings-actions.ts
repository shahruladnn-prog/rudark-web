'use server';

import { adminDb } from '@/lib/firebase-admin';
import { ShippingSettings, DEFAULT_SHIPPING_SETTINGS } from '@/types/shipping-settings';

const SETTINGS_DOC_PATH = 'settings/shipping';

/**
 * Get current shipping settings from Firestore
 * Returns default settings if document doesn't exist
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
    try {
        const docRef = adminDb.doc(SETTINGS_DOC_PATH);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log('[ShippingSettings] No settings found, returning defaults');
            return DEFAULT_SHIPPING_SETTINGS;
        }

        const data = docSnap.data();

        // Extract only the fields we need, excluding Firestore Timestamps
        return {
            free_shipping_enabled: data?.free_shipping_enabled ?? DEFAULT_SHIPPING_SETTINGS.free_shipping_enabled,
            free_shipping_threshold: data?.free_shipping_threshold ?? DEFAULT_SHIPPING_SETTINGS.free_shipping_threshold,
            free_shipping_applies_to: data?.free_shipping_applies_to ?? DEFAULT_SHIPPING_SETTINGS.free_shipping_applies_to,
            free_shipping_regions: data?.free_shipping_regions,
            free_shipping_categories: data?.free_shipping_categories ?? []
        };
    } catch (error) {
        console.error('[ShippingSettings] Error fetching settings:', error);
        return DEFAULT_SHIPPING_SETTINGS;
    }
}

/**
 * Update shipping settings in Firestore
 * Creates document if it doesn't exist
 */
export async function updateShippingSettings(settings: Partial<ShippingSettings>): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.doc(SETTINGS_DOC_PATH);

        const updateData = {
            ...settings,
            updated_at: new Date()
        };

        // If document doesn't exist, add created_at
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            (updateData as any).created_at = new Date();
        }

        await docRef.set(updateData, { merge: true });

        console.log('[ShippingSettings] Settings updated successfully');
        return { success: true };
    } catch (error) {
        console.error('[ShippingSettings] Error updating settings:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Check if an order qualifies for free shipping
 * @param subtotal - Order subtotal (before shipping)
 * @param cartItems - Array of cart items with category_slug
 * @returns true if free shipping should be applied
 */
export async function qualifiesForFreeShipping(
    subtotal: number,
    cartItems: Array<{ category_slug?: string }>
): Promise<boolean> {
    const settings = await getShippingSettings();

    if (!settings.free_shipping_enabled) {
        return false;
    }

    // Check subtotal threshold
    if (subtotal < settings.free_shipping_threshold) {
        return false;
    }

    // If no categories specified, apply to all products
    if (!settings.free_shipping_categories || settings.free_shipping_categories.length === 0) {
        return true;
    }

    // ALL items must be from qualifying categories (not just ANY)
    // This prevents customers from mixing heavy non-qualifying items to get free shipping
    const allItemsQualify = cartItems.every(item =>
        item.category_slug && settings.free_shipping_categories!.includes(item.category_slug)
    );

    return allItemsQualify;
}
