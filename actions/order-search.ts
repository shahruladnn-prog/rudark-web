'use server';

import { adminDb } from '@/lib/firebase-admin';

// Types
export interface OrderSearchResult {
    success: boolean;
    order?: any;
    tracking?: any;
    error?: string;
}

const PARCELASIA_API_URL = 'https://app.myparcelasia.com/apiv2';

// Helper for timeout
const fetchWithTimeout = async (resource: string, options: any = {}) => {
    const { timeout = 8000 } = options; // 8s timeout for fetch
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

// Generic Promise Timeout
const promiseTimeout = <T>(promise: Promise<T>, ms: number, fallback: T | null = null): Promise<T | null> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T | null>((resolve) => {
        timeoutId = setTimeout(() => {
            console.log(`[PromiseTimeout] Timed out after ${ms}ms`);
            resolve(fallback);
        }, ms);
    });

    return Promise.race([
        promise.then((res) => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
};

async function traceShipment(trackingNo: string) {
    const apiKey = process.env.PARCELASIA_API_KEY;
    if (!apiKey) return null;

    try {
        const payload = {
            api_key: apiKey,
            tracking_no: trackingNo
        };

        const response = await fetchWithTimeout(`${PARCELASIA_API_URL}/trace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status && data.data) {
            return data.data;
        }
    } catch (e) {
        console.error("Trace Error:", e);
    }
    return null;
}

export async function searchOrder(query: string): Promise<OrderSearchResult> {
    if (!query || query.trim().length < 3) {
        return { success: false, error: "Please enter a valid Order ID, Phone Number, or Tracking Number." };
    }

    const cleanQuery = query.trim();
    console.log(`[OrderSearch] Searching for: ${cleanQuery}`);

    try {
        // Run DB Search and Direct Trace in parallel with independent timeouts
        const dbPromise = (async () => {
            // 1. Try ID
            const docRef = adminDb.collection('orders').doc(cleanQuery);
            const docSnap = await docRef.get();
            if (docSnap.exists) return { id: docSnap.id, ...docSnap.data() };

            // 2. Try Phone
            const phoneQuery = await adminDb.collection('orders').where('phone', '==', cleanQuery).limit(1).get();
            if (!phoneQuery.empty) return { id: phoneQuery.docs[0].id, ...phoneQuery.docs[0].data() };

            // 3. Try Tracking No in DB
            const trackQuery = await adminDb.collection('orders').where('tracking_no', '==', cleanQuery).limit(1).get();
            if (!trackQuery.empty) return { id: trackQuery.docs[0].id, ...trackQuery.docs[0].data() };

            return null;
        })();

        // Wrap DB call in 6s timeout
        const safeDbPromise = promiseTimeout(dbPromise, 6000, null);

        // Trace is already safely handled but we run it nicely
        const tracePromise = traceShipment(cleanQuery);

        // Wait for both results. Even if one fails/times out, we get mixed results.
        const [orderDataResult, directTraceData] = await Promise.all([safeDbPromise, tracePromise]);

        // Cast to avoid TS errors
        const orderData = orderDataResult as any;

        if (orderData) {
            console.log(`[OrderSearch] Found Order in DB: ${orderData.id}`);
            let finalTracking = null;

            if (directTraceData) {
                finalTracking = directTraceData;
            } else if (orderData.tracking_no || orderData.shipment_id) {
                const storedTracking = orderData.tracking_no || orderData.shipment_id;
                if (storedTracking !== cleanQuery) {
                    // If we found order via Phone/ID, try to trace its stored tracking number
                    // Use timeout wrapper here too
                    finalTracking = await promiseTimeout(traceShipment(storedTracking), 8000, null);
                }
            }
            return { success: true, order: orderData, tracking: finalTracking };
        }

        // Use direct trace if DB failed or had no record
        if (directTraceData) {
            console.log(`[OrderSearch] Found Direct Trace only.`);
            return {
                success: true,
                tracking: directTraceData,
                order: { id: 'EXTERNAL', status: 'Shipped', tracking_no: cleanQuery }
            };
        }

        return { success: false, error: "Order or Shipment not found." };

    } catch (error: any) {
        console.error("[OrderSearch] Error:", error);
        return { success: false, error: "Search failed. Please try again." };
    }
}
