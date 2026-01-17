'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Store } from '@/types/store';
import { revalidatePath } from 'next/cache';

/**
 * Get all stores
 */
export async function getStores(): Promise<Store[]> {
    try {
        const snapshot = await adminDb.collection('stores').orderBy('name', 'asc').get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                loyverse_store_id: data.loyverse_store_id || '',
                loyverse_payment_type_id: data.loyverse_payment_type_id || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || '',
                is_default: data.is_default || false,
                is_active: data.is_active !== false, // Default to true
                created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            };
        });
    } catch (error) {
        console.error('[getStores] Error:', error);
        return [];
    }
}

/**
 * Get the default store for web orders
 */
export async function getDefaultStore(): Promise<Store | null> {
    try {
        // First try to find the default store
        const defaultSnapshot = await adminDb.collection('stores')
            .where('is_default', '==', true)
            .limit(1)
            .get();

        if (!defaultSnapshot.empty) {
            const doc = defaultSnapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                loyverse_store_id: data.loyverse_store_id || '',
                loyverse_payment_type_id: data.loyverse_payment_type_id || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || '',
                is_default: true,
                is_active: data.is_active !== false,
                created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            };
        }

        // Fallback: Get first active store
        const fallbackSnapshot = await adminDb.collection('stores')
            .where('is_active', '==', true)
            .limit(1)
            .get();

        if (!fallbackSnapshot.empty) {
            const doc = fallbackSnapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                loyverse_store_id: data.loyverse_store_id || '',
                loyverse_payment_type_id: data.loyverse_payment_type_id || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || '',
                is_default: false,
                is_active: true,
                created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            };
        }

        return null;
    } catch (error) {
        console.error('[getDefaultStore] Error:', error);
        return null;
    }
}

/**
 * Get a single store by ID
 */
export async function getStore(id: string): Promise<Store | null> {
    try {
        const doc = await adminDb.collection('stores').doc(id).get();
        if (!doc.exists) return null;

        const data = doc.data()!;
        return {
            id: doc.id,
            name: data.name || '',
            loyverse_store_id: data.loyverse_store_id || '',
            loyverse_payment_type_id: data.loyverse_payment_type_id || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            is_default: data.is_default || false,
            is_active: data.is_active !== false,
            created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
            updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
        };
    } catch (error) {
        console.error('[getStore] Error:', error);
        return null;
    }
}

/**
 * Save (create or update) a store
 */
export async function saveStore(storeData: Partial<Store>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { id, ...data } = storeData;
        const now = new Date();

        // Validation: Required fields
        if (!data.name?.trim()) {
            return { success: false, error: 'Store name is required' };
        }
        if (!data.loyverse_store_id?.trim()) {
            return { success: false, error: 'Loyverse Store ID is required' };
        }

        // If setting as default, unset other defaults first
        if (data.is_default) {
            const existingDefaults = await adminDb.collection('stores')
                .where('is_default', '==', true)
                .get();

            const batch = adminDb.batch();
            existingDefaults.docs.forEach(doc => {
                if (doc.id !== id) {
                    batch.update(doc.ref, { is_default: false });
                }
            });
            await batch.commit();
        }

        const payload = {
            ...data,
            updated_at: now
        };

        if (id) {
            // Update existing
            await adminDb.collection('stores').doc(id).update(payload);
            revalidatePath('/admin/stores');
            revalidatePath(`/admin/stores/${id}`);
            return { success: true, id };
        } else {
            // Create new
            const docRef = await adminDb.collection('stores').add({
                ...payload,
                created_at: now
            });
            revalidatePath('/admin/stores');
            return { success: true, id: docRef.id };
        }
    } catch (error: any) {
        console.error('[saveStore] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a store
 */
export async function deleteStore(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if it's the default store
        const storeDoc = await adminDb.collection('stores').doc(id).get();
        if (storeDoc.exists && storeDoc.data()?.is_default) {
            return { success: false, error: 'Cannot delete the default store' };
        }

        await adminDb.collection('stores').doc(id).delete();
        revalidatePath('/admin/stores');
        return { success: true };
    } catch (error: any) {
        console.error('[deleteStore] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Initialize default store with current hardcoded values
 * Run once to migrate from hardcoded to dynamic
 */
export async function initializeDefaultStore(): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if any stores exist
        const existing = await adminDb.collection('stores').limit(1).get();
        if (!existing.empty) {
            return { success: false, error: 'Stores already exist. Migration not needed.' };
        }

        // Create default store with current hardcoded values
        const defaultStore = {
            name: 'Main Store',
            loyverse_store_id: '0a9b6f62-60b6-4de6-b3a8-164b96f402c1',
            loyverse_payment_type_id: 'e3f6b4a8-2c5d-4b89-bb7d-8d6819045065',
            address: '',
            is_default: true,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        };

        await adminDb.collection('stores').add(defaultStore);
        revalidatePath('/admin/stores');

        return { success: true };
    } catch (error: any) {
        console.error('[initializeDefaultStore] Error:', error);
        return { success: false, error: error.message };
    }
}
