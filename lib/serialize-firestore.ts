/**
 * Utility to serialize Firestore data for client components
 * Converts Firestore Timestamps to ISO strings to prevent serialization errors
 */

/**
 * Recursively serialize Firestore data
 * Handles nested objects and arrays
 */
export function serializeFirestoreData<T = any>(data: any): T {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle Firestore Timestamp
    if (data?._seconds !== undefined && data?._nanoseconds !== undefined) {
        try {
            return new Date(data._seconds * 1000).toISOString() as any;
        } catch {
            return null as any;
        }
    }

    // Handle Date objects
    if (data instanceof Date) {
        return data.toISOString() as any;
    }

    // Handle objects with toDate method (Firestore Timestamp)
    if (typeof data?.toDate === 'function') {
        try {
            return data.toDate().toISOString() as any;
        } catch {
            return null as any;
        }
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => serializeFirestoreData(item)) as any;
    }

    // Handle plain objects
    if (typeof data === 'object') {
        const serialized: any = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                serialized[key] = serializeFirestoreData(data[key]);
            }
        }
        return serialized;
    }

    // Return primitive values as-is
    return data;
}

/**
 * Serialize a Firestore document
 */
export function serializeDoc<T = any>(doc: any): T | null {
    if (!doc || !doc.exists) {
        return null;
    }

    const data = doc.data();
    return serializeFirestoreData({
        id: doc.id,
        ...data
    });
}

/**
 * Serialize multiple Firestore documents
 */
export function serializeDocs<T = any>(snapshot: any): T[] {
    if (!snapshot || snapshot.empty) {
        return [];
    }

    return snapshot.docs.map((doc: any) => serializeDoc<T>(doc));
}
