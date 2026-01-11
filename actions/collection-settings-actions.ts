'use server';

import { adminDb } from '@/lib/firebase-admin';
import { serializeFirestoreData } from '@/lib/serialize-firestore';
import { CollectionSettings, CollectionPoint, DEFAULT_COLLECTION_SETTINGS } from '@/types/collection-settings';

const SETTINGS_DOC = 'settings/collection_settings';

/**
 * Get collection settings from Firestore
 */
export async function getCollectionSettings(): Promise<CollectionSettings> {
    try {
        const doc = await adminDb.doc(SETTINGS_DOC).get();

        if (!doc.exists) {
            return DEFAULT_COLLECTION_SETTINGS;
        }

        const data = doc.data();

        // Serialize all Firestore data including timestamps
        return serializeFirestoreData<CollectionSettings>({
            enabled: data?.enabled ?? DEFAULT_COLLECTION_SETTINGS.enabled,
            collection_points: data?.collection_points ?? DEFAULT_COLLECTION_SETTINGS.collection_points
        });
    } catch (error) {
        console.error('Error fetching collection settings:', error);
        return DEFAULT_COLLECTION_SETTINGS;
    }
}

/**
 * Update collection settings
 */
export async function updateCollectionSettings(settings: CollectionSettings) {
    try {
        await adminDb.doc(SETTINGS_DOC).set(settings, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating collection settings:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Add a new collection point
 */
export async function addCollectionPoint(point: Omit<CollectionPoint, 'id' | 'created_at' | 'updated_at'>) {
    try {
        const settings = await getCollectionSettings();

        const newPoint: CollectionPoint = {
            ...point,
            id: `cp_${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date()
        };

        settings.collection_points.push(newPoint);

        await adminDb.doc(SETTINGS_DOC).set(settings, { merge: true });

        return { success: true, point: newPoint };
    } catch (error) {
        console.error('Error adding collection point:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Update a collection point
 */
export async function updateCollectionPoint(id: string, updates: Partial<CollectionPoint>) {
    try {
        const settings = await getCollectionSettings();

        const index = settings.collection_points.findIndex(p => p.id === id);
        if (index === -1) {
            return { success: false, error: 'Collection point not found' };
        }

        settings.collection_points[index] = {
            ...settings.collection_points[index],
            ...updates,
            updated_at: new Date()
        };

        await adminDb.doc(SETTINGS_DOC).set(settings, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error updating collection point:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Delete a collection point
 */
export async function deleteCollectionPoint(id: string) {
    try {
        const settings = await getCollectionSettings();

        settings.collection_points = settings.collection_points.filter(p => p.id !== id);

        await adminDb.doc(SETTINGS_DOC).set(settings, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error deleting collection point:', error);
        return { success: false, error: String(error) };
    }
}
