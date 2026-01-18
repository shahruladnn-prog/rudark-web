'use server';

import { adminDb } from '@/lib/firebase-admin';

const PARCELASIA_API_URL = 'https://app.myparcelasia.com/apiv2';

/**
 * ParcelAsia Sync Actions
 * 
 * Used to fetch real tracking numbers AFTER manual checkout in ParcelAsia portal.
 * The create_shipment API only adds to cart - no tracking number yet.
 * Tracking number is only available after staff checks out in ParcelAsia.
 */

interface SyncResult {
    success: boolean;
    orderId: string;
    tracking_no?: string;
    error?: string;
}

interface BatchSyncResult {
    success: boolean;
    total: number;
    synced: number;
    failed: number;
    results: SyncResult[];
}

/**
 * Get all orders that need tracking sync
 * Orders with parcelasia_shipment_id but no tracking_no yet
 */
export async function getOrdersNeedingSync(): Promise<{
    success: boolean;
    orders: { id: string; parcelasia_shipment_id: string; customer_name: string; created_at: string }[];
    error?: string;
}> {
    try {
        const snapshot = await adminDb.collection('orders')
            .where('tracking_synced', '==', false)
            .where('shipping_status', '==', 'READY_TO_SHIP')
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        const orders = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    parcelasia_shipment_id: data.parcelasia_shipment_id,
                    customer_name: data.customer?.name || 'Unknown',
                    created_at: data.created_at?.toDate?.()?.toISOString() || 'Unknown'
                };
            })
            .filter(order => order.parcelasia_shipment_id);  // Only orders with shipment ID

        return { success: true, orders };
    } catch (error: any) {
        console.error('[GetOrdersNeedingSync] Error:', error);
        return { success: false, orders: [], error: error.message };
    }
}

/**
 * Fetch tracking number from ParcelAsia for a single shipment
 * Uses /get_shipments endpoint with shipment_key
 */
export async function fetchTrackingFromParcelAsia(shipmentKey: string): Promise<{
    success: boolean;
    tracking_no?: string;
    status?: string;
    error?: string;
}> {
    const apiKey = process.env.PARCELASIA_API_KEY;

    if (!apiKey) {
        return { success: false, error: 'ParcelAsia API key not configured' };
    }

    if (!shipmentKey) {
        return { success: false, error: 'No shipment key provided' };
    }

    try {
        console.log(`[FetchTracking] Fetching tracking for shipment: ${shipmentKey}`);

        const response = await fetch(`${PARCELASIA_API_URL}/get_shipments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                shipment_keys: [shipmentKey]
            })
        });

        const data = await response.json();

        // Log the full API response for debugging
        console.log(`[FetchTracking] Full API Response:`, JSON.stringify(data, null, 2));

        if (data.status === true && data.data) {
            // Response is an OBJECT keyed by shipment_key (not array!)
            // e.g., { "77cf84021b8f5db94e25c858a6b0c8ac": { shipment details } }
            let shipment: any;

            if (Array.isArray(data.data)) {
                shipment = data.data[0];
            } else if (typeof data.data === 'object') {
                // Get first shipment from keyed object
                const keys = Object.keys(data.data);
                if (keys.length > 0) {
                    shipment = data.data[keys[0]];
                    console.log(`[FetchTracking] Extracted shipment from key: ${keys[0]}`);
                }
            }

            if (!shipment) {
                return {
                    success: false,
                    error: 'Shipment not found. May have been deleted from ParcelAsia.'
                };
            }

            // Log shipment object to see all available fields
            console.log(`[FetchTracking] Shipment object keys:`, Object.keys(shipment));
            console.log(`[FetchTracking] Shipment status:`, shipment.shipment_status);
            console.log(`[FetchTracking] Tracking no:`, shipment.tracking_no);

            // Check ALL possible tracking number field names from ParcelAsia API
            const trackingNo = shipment.tracking_no
                || shipment.awb_no
                || shipment.consignment_no
                || shipment.tracking_number  // Additional possible field
                || shipment.connote_no       // Connote number variant
                || shipment.waybill_no;      // Waybill variant

            // Also check for "Pending Dropoff" which means checkout IS complete
            const validCheckoutStatuses = ['pending dropoff', 'pending_dropoff', 'awaiting_pickup', 'shipped', 'in_transit', 'delivering'];
            const shipmentStatus = (shipment.shipment_status || '').toLowerCase();

            if (!trackingNo) {
                // If status indicates checkout completed but no tracking found, check nested objects
                if (validCheckoutStatuses.some(s => shipmentStatus.includes(s))) {
                    console.warn(`[FetchTracking] Order is ${shipmentStatus} but no tracking_no field found. Dumping shipment:`, shipment);
                    return {
                        success: false,
                        error: `Shipment status is "${shipmentStatus}" but tracking number not found in API response. Check logs.`,
                        status: shipmentStatus
                    };
                }

                // Shipment exists but not checked out yet
                return {
                    success: false,
                    error: 'Shipment not checked out yet. Please checkout in ParcelAsia portal first.',
                    status: shipmentStatus || 'pending'
                };
            }

            console.log(`[FetchTracking] Found tracking: ${trackingNo}`);
            return {
                success: true,
                tracking_no: trackingNo,
                status: shipmentStatus
            };
        } else {
            return {
                success: false,
                error: data.message || 'Failed to fetch shipment details'
            };
        }
    } catch (error: any) {
        console.error('[FetchTracking] Error:', error);
        return { success: false, error: 'Network error: ' + error.message };
    }
}

/**
 * Checkout a shipment via ParcelAsia API
 * This deducts credits and returns the real tracking number
 * Called automatically after create_shipment to skip manual checkout
 */
export async function checkoutShipment(shipmentKey: string): Promise<{
    success: boolean;
    tracking_no?: string;
    error?: string;
}> {
    const apiKey = process.env.PARCELASIA_API_KEY;

    if (!apiKey) {
        return { success: false, error: 'ParcelAsia API key not configured' };
    }

    if (!shipmentKey) {
        return { success: false, error: 'No shipment key provided' };
    }

    try {
        console.log(`[ParcelAsia Checkout] Checking out shipment: ${shipmentKey}`);

        const response = await fetch(`${PARCELASIA_API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                shipment_keys: [shipmentKey]
            })
        });

        const data = await response.json();
        console.log(`[ParcelAsia Checkout] Response:`, JSON.stringify(data, null, 2));

        if (data.status === true) {
            // First try to extract tracking from the checkout response itself
            let trackingNo: string | undefined;

            // The checkout response contains tracking in data.shipments object
            // Format: { data: { shipments: { "<shipment_key>": { tracking_no: "..." } } } }
            if (data.data) {
                // Check for tracking in data.shipments (keyed by shipment_key)
                if (data.data.shipments && typeof data.data.shipments === 'object') {
                    const shipmentKeys = Object.keys(data.data.shipments);
                    if (shipmentKeys.length > 0) {
                        const shipment = data.data.shipments[shipmentKeys[0]];
                        trackingNo = shipment?.tracking_no
                            || shipment?.awb_no
                            || shipment?.consignment_no;

                        if (trackingNo) {
                            console.log(`[ParcelAsia Checkout] Found tracking in shipments object: ${trackingNo}`);
                        }
                    }
                }

                // Fallback: check direct fields on data.data
                if (!trackingNo) {
                    const checkoutData = Array.isArray(data.data) ? data.data[0] : data.data;
                    if (checkoutData) {
                        trackingNo = checkoutData.tracking_no
                            || checkoutData.awb_no
                            || checkoutData.consignment_no
                            || checkoutData.tracking_number;

                        if (trackingNo) {
                            console.log(`[ParcelAsia Checkout] Found tracking in checkout response: ${trackingNo}`);
                        }
                    }
                }
            }

            // If not found in checkout response, fetch from get_shipments with retry
            if (!trackingNo) {
                console.log(`[ParcelAsia Checkout] Tracking not in checkout response, fetching from get_shipments...`);

                // Wait longer for ParcelAsia to process (J&T can be slow)
                await new Promise(resolve => setTimeout(resolve, 3000));

                const fetchResult = await fetchTrackingFromParcelAsia(shipmentKey);

                if (fetchResult.success && fetchResult.tracking_no) {
                    trackingNo = fetchResult.tracking_no;
                    console.log(`[ParcelAsia Checkout] Found tracking via get_shipments: ${trackingNo}`);
                } else {
                    // Retry once more after additional delay
                    console.log(`[ParcelAsia Checkout] First fetch failed, retrying after 3s delay...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    const retryResult = await fetchTrackingFromParcelAsia(shipmentKey);
                    if (retryResult.success && retryResult.tracking_no) {
                        trackingNo = retryResult.tracking_no;
                        console.log(`[ParcelAsia Checkout] Found tracking on retry: ${trackingNo}`);
                    } else {
                        // Third retry for stubborn cases
                        console.log(`[ParcelAsia Checkout] Second fetch failed, final retry after 5s...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        const finalRetry = await fetchTrackingFromParcelAsia(shipmentKey);
                        if (finalRetry.success && finalRetry.tracking_no) {
                            trackingNo = finalRetry.tracking_no;
                            console.log(`[ParcelAsia Checkout] Found tracking on final retry: ${trackingNo}`);
                        } else {
                            console.warn(`[ParcelAsia Checkout] Still no tracking after 3 retries:`, finalRetry.error);
                        }
                    }
                }
            }

            if (trackingNo) {
                return {
                    success: true,
                    tracking_no: trackingNo
                };
            } else {
                // Checkout succeeded but tracking not available yet
                console.warn(`[ParcelAsia Checkout] Checkout succeeded but tracking not yet available`);
                return {
                    success: true, // Checkout itself was successful
                    error: 'Checkout successful, but tracking not immediately available. Will sync later.'
                };
            }
        } else {
            const errorMsg = data.message || 'Checkout failed';
            console.error(`[ParcelAsia Checkout] Failed:`, errorMsg);
            return { success: false, error: errorMsg };
        }
    } catch (error: any) {
        console.error('[ParcelAsia Checkout] Error:', error);
        return { success: false, error: 'Network error: ' + error.message };
    }
}

/**
 * Sync tracking number for a single order
 */
export async function syncOrderTracking(orderId: string): Promise<SyncResult> {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, orderId, error: 'Order not found' };
        }

        const order = orderDoc.data();
        const shipmentId = order?.parcelasia_shipment_id;

        if (!shipmentId) {
            return { success: false, orderId, error: 'No ParcelAsia shipment ID' };
        }

        if (order?.tracking_synced && order?.tracking_no) {
            return { success: true, orderId, tracking_no: order.tracking_no, error: 'Already synced' };
        }

        // Fetch tracking from ParcelAsia
        const result = await fetchTrackingFromParcelAsia(shipmentId);

        if (result.success && result.tracking_no) {
            // Update order with real tracking number
            await orderRef.update({
                tracking_no: result.tracking_no,
                tracking_synced: true,
                tracking_synced_at: new Date(),
                shipping_status: 'AWAITING_PICKUP'  // Ready for courier pickup
            });

            console.log(`[SyncOrder] Order ${orderId} synced: ${result.tracking_no}`);
            return { success: true, orderId, tracking_no: result.tracking_no };
        } else {
            // Log the error but don't fail completely
            await orderRef.update({
                tracking_sync_error: result.error,
                tracking_sync_attempted_at: new Date()
            });

            return { success: false, orderId, error: result.error };
        }
    } catch (error: any) {
        console.error(`[SyncOrder] Error for ${orderId}:`, error);
        return { success: false, orderId, error: error.message };
    }
}

/**
 * Batch sync all unsynced orders
 * With rate limiting to avoid API throttling
 */
export async function batchSyncTracking(): Promise<BatchSyncResult> {
    const results: SyncResult[] = [];
    let synced = 0;
    let failed = 0;

    try {
        // Get all orders needing sync
        const { orders, error } = await getOrdersNeedingSync();

        if (error) {
            return {
                success: false,
                total: 0,
                synced: 0,
                failed: 0,
                results: [{ success: false, orderId: 'batch', error }]
            };
        }

        console.log(`[BatchSync] Found ${orders.length} orders to sync`);

        // Process each order with a small delay to avoid rate limiting
        for (const order of orders) {
            const result = await syncOrderTracking(order.id);
            results.push(result);

            if (result.success) {
                synced++;
            } else {
                failed++;
            }

            // Small delay between API calls (300ms)
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return {
            success: true,
            total: orders.length,
            synced,
            failed,
            results
        };
    } catch (error: any) {
        console.error('[BatchSync] Error:', error);
        return {
            success: false,
            total: 0,
            synced,
            failed,
            results
        };
    }
}

/**
 * Get order by tracking number (for barcode scanner)
 */
export async function getOrderByTrackingNo(trackingNo: string): Promise<{
    success: boolean;
    order?: any;
    error?: string;
}> {
    try {
        if (!trackingNo || trackingNo.length < 5) {
            return { success: false, error: 'Invalid tracking number' };
        }

        // Helper to serialize Firestore timestamps
        const serializeOrder = (id: string, data: any) => {
            const serialized: any = { id };
            for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'object' && 'toDate' in value) {
                    // Convert Firestore Timestamp to ISO string
                    serialized[key] = (value as any).toDate().toISOString();
                } else if (value && typeof value === 'object' && '_seconds' in value) {
                    // Handle serialized timestamp format
                    serialized[key] = new Date((value as any)._seconds * 1000).toISOString();
                } else {
                    serialized[key] = value;
                }
            }
            return serialized;
        };

        // Search by tracking_no
        const snapshot = await adminDb.collection('orders')
            .where('tracking_no', '==', trackingNo)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Also check parcelasia_shipment_id as fallback
            const fallbackSnapshot = await adminDb.collection('orders')
                .where('parcelasia_shipment_id', '==', trackingNo)
                .limit(1)
                .get();

            if (fallbackSnapshot.empty) {
                return { success: false, error: 'Order not found for this tracking number' };
            }

            const doc = fallbackSnapshot.docs[0];
            return {
                success: true,
                order: serializeOrder(doc.id, doc.data())
            };
        }

        const doc = snapshot.docs[0];
        return {
            success: true,
            order: serializeOrder(doc.id, doc.data())
        };
    } catch (error: any) {
        console.error('[GetOrderByTracking] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark order as shipped (from barcode scanner)
 */
export async function markOrderShipped(orderId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data();
        const status = order?.status;

        // State validation - only allow shipping from valid states
        const validStates = ['PAID', 'READY_TO_SHIP', 'AWAITING_PICKUP'];
        if (!validStates.includes(status)) {
            return {
                success: false,
                error: `Cannot ship order with status: ${status}. Must be PAID, READY_TO_SHIP, or AWAITING_PICKUP.`
            };
        }

        await orderRef.update({
            status: 'SHIPPED',
            shipping_status: 'SHIPPED',
            shipped_at: new Date(),
            updated_at: new Date()
        });

        console.log(`[MarkShipped] Order ${orderId} marked as shipped`);
        return { success: true };
    } catch (error: any) {
        console.error('[MarkShipped] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark order as cancelled
 */
export async function markOrderCancelled(orderId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data();
        const status = order?.status;

        // Cannot cancel already delivered or refunded orders
        const invalidStates = ['DELIVERED', 'COMPLETED', 'REFUNDED'];
        if (invalidStates.includes(status)) {
            return {
                success: false,
                error: `Cannot cancel order with status: ${status}`
            };
        }

        await orderRef.update({
            status: 'CANCELLED',
            shipping_status: 'CANCELLED',
            cancelled_at: new Date(),
            cancellation_reason: reason || 'Cancelled via admin',
            updated_at: new Date()
        });

        console.log(`[MarkCancelled] Order ${orderId} cancelled`);
        return { success: true };
    } catch (error: any) {
        console.error('[MarkCancelled] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate beautiful WhatsApp click-to-chat link with full order details
 * Note: Using text symbols instead of emojis for better compatibility
 */
export async function generateWhatsAppLink(
    phone: string,
    orderId: string,
    trackingNo: string,
    customerName?: string,
    items?: { name: string; quantity: number }[],
    storeName?: string
): Promise<string> {
    // Normalize phone number (remove +, spaces, leading 0)
    let normalized = phone.replace(/[\s\-\+]/g, '');
    if (normalized.startsWith('0')) {
        normalized = '60' + normalized.substring(1);
    }
    if (!normalized.startsWith('60')) {
        normalized = '60' + normalized;
    }

    // Default store name
    const store = storeName || "Rud'Ark ProShop";
    const firstName = customerName?.split(' ')[0] || 'there';

    // Build items list if provided
    let itemsList = '';
    if (items && items.length > 0) {
        itemsList = items.map(item => `   - ${item.name} x${item.quantity}`).join('\n');
    }

    // Clean text-based message template (no emojis to avoid encoding issues)
    const lines = [
        `Hai ${firstName}!`,
        ``,
        `Warmest regards from *${store}*`,
        `www.rudark.my`,
        ``,
        `--------------------------------`,
        ``,
        `*ORDER SHIPPED*`,
        ``,
        `Your order *#${orderId.substring(0, 12)}* has been successfully processed and is now on its way to you!`,
        ``
    ];

    // Add items if available
    if (itemsList) {
        lines.push(`*Your Items:*`);
        lines.push(itemsList);
        lines.push(``);
    }

    lines.push(
        `*Tracking Number:*`,
        `${trackingNo}`,
        ``,
        `*Track Your Parcel:*`,
        `https://myparcelasia.com/track?tno=${trackingNo}`,
        ``,
        `--------------------------------`,
        ``,
        `*Delivery Tips:*`,
        `- Keep your phone available for courier calls`,
        `- Check tracking for estimated delivery`,
        ``,
        `If you have any questions, feel free to reply to this message!`,
        ``,
        `Thank you for shopping with us!`,
        `With love,`,
        `*${store} Team*`
    );

    const message = lines.join('\n');

    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate simple WhatsApp link (for quick use without order details)
 */
export async function generateSimpleWhatsAppLink(
    phone: string,
    message: string
): Promise<string> {
    let normalized = phone.replace(/[\s\-\+]/g, '');
    if (normalized.startsWith('0')) {
        normalized = '60' + normalized.substring(1);
    }
    if (!normalized.startsWith('60')) {
        normalized = '60' + normalized;
    }
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Manually update tracking number for an order
 * Used as fallback when automatic sync fails
 */
export async function updateTrackingManually(orderId: string, trackingNo: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        if (!orderId || !trackingNo) {
            return { success: false, error: 'Order ID and tracking number are required' };
        }

        // Validate tracking number format (basic validation)
        if (trackingNo.length < 5) {
            return { success: false, error: 'Tracking number seems too short' };
        }

        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        await orderRef.update({
            tracking_no: trackingNo.trim(),
            tracking_synced: true,
            tracking_synced_at: new Date(),
            tracking_sync_method: 'MANUAL',
            shipping_status: 'AWAITING_PICKUP',
            updated_at: new Date()
        });

        console.log(`[UpdateTracking] Order ${orderId} manually updated with tracking: ${trackingNo}`);
        return { success: true };
    } catch (error: any) {
        console.error('[UpdateTracking] Error:', error);
        return { success: false, error: error.message };
    }
}


// ================================
// RETURN / EXCHANGE FLOW FUNCTIONS
// ================================

interface ReturnResult {
    success: boolean;
    orderId: string;
    itemsRestocked?: number;
    error?: string;
}

/**
 * Mark order as returned
 * Updates order status to RETURNED
 */
export async function markOrderReturned(orderId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data();
        const status = order?.status;

        // Can only return from these states
        const validStates = ['SHIPPED', 'DELIVERED'];
        if (!validStates.includes(status)) {
            return {
                success: false,
                error: `Cannot return order with status: ${status}. Must be SHIPPED or DELIVERED.`
            };
        }

        await orderRef.update({
            status: 'RETURNED',
            shipping_status: 'RETURNED',
            returned_at: new Date(),
            return_reason: reason || 'Returned via admin',
            updated_at: new Date()
        });

        console.log(`[MarkReturned] Order ${orderId} marked as returned`);
        return { success: true };
    } catch (error: any) {
        console.error('[MarkReturned] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Restock items from a returned order
 * Increases inventory in Loyverse for each item
 */
export async function restockOrderItems(orderId: string): Promise<{
    success: boolean;
    itemsRestocked: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let itemsRestocked = 0;

    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, itemsRestocked: 0, errors: ['Order not found'] };
        }

        const order = orderDoc.data();
        const items = order?.items || [];

        if (items.length === 0) {
            return { success: true, itemsRestocked: 0, errors: ['No items to restock'] };
        }

        const loyverseToken = process.env.LOYVERSE_API_TOKEN;
        if (!loyverseToken) {
            return { success: false, itemsRestocked: 0, errors: ['Loyverse API token not configured'] };
        }

        // Get store ID (first store)
        const storeResponse = await fetch('https://api.loyverse.com/v1.0/stores', {
            headers: { 'Authorization': `Bearer ${loyverseToken}` }
        });
        const storeData = await storeResponse.json();
        const storeId = storeData.stores?.[0]?.id;

        if (!storeId) {
            return { success: false, itemsRestocked: 0, errors: ['Could not get Loyverse store ID'] };
        }

        // Process each item
        for (const item of items) {
            const variantId = item.variant_id;
            const quantity = item.quantity || 1;

            if (!variantId) {
                errors.push(`No variant ID for item: ${item.name}`);
                continue;
            }

            try {
                // Get current inventory level
                const inventoryResponse = await fetch(
                    `https://api.loyverse.com/v1.0/inventory?store_id=${storeId}&variant_ids=${variantId}`,
                    { headers: { 'Authorization': `Bearer ${loyverseToken}` } }
                );
                const inventoryData = await inventoryResponse.json();
                const currentLevel = inventoryData.inventory_levels?.[0];

                if (!currentLevel) {
                    errors.push(`Could not get inventory for: ${item.name}`);
                    continue;
                }

                const newQuantity = (currentLevel.in_stock || 0) + quantity;

                // Update inventory level
                const updateResponse = await fetch('https://api.loyverse.com/v1.0/inventory', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${loyverseToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inventory_levels: [{
                            variant_id: variantId,
                            store_id: storeId,
                            in_stock: newQuantity
                        }]
                    })
                });

                if (updateResponse.ok) {
                    itemsRestocked++;
                    console.log(`[Restock] Restocked ${quantity} units of ${item.name}`);
                } else {
                    const errorData = await updateResponse.json();
                    errors.push(`Failed to restock ${item.name}: ${errorData.message || 'Unknown error'}`);
                }
            } catch (err: any) {
                errors.push(`Error restocking ${item.name}: ${err.message}`);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Update order to reflect restock
        await orderRef.update({
            items_restocked: true,
            items_restocked_at: new Date(),
            items_restocked_count: itemsRestocked
        });

        return {
            success: errors.length === 0,
            itemsRestocked,
            errors
        };
    } catch (error: any) {
        console.error('[RestockItems] Error:', error);
        return { success: false, itemsRestocked: 0, errors: [error.message] };
    }
}

/**
 * Process a full return: mark as returned + restock items
 */
export async function processReturn(
    orderId: string,
    reason?: string,
    shouldRestock: boolean = true
): Promise<ReturnResult> {
    try {
        // First mark as returned
        const markResult = await markOrderReturned(orderId, reason);
        if (!markResult.success) {
            return { success: false, orderId, error: markResult.error };
        }

        // Then restock if requested
        let itemsRestocked = 0;
        if (shouldRestock) {
            const restockResult = await restockOrderItems(orderId);
            itemsRestocked = restockResult.itemsRestocked;

            if (restockResult.errors.length > 0) {
                console.warn(`[ProcessReturn] Restock had errors: ${restockResult.errors.join(', ')}`);
            }
        }

        return {
            success: true,
            orderId,
            itemsRestocked
        };
    } catch (error: any) {
        console.error('[ProcessReturn] Error:', error);
        return { success: false, orderId, error: error.message };
    }
}

/**
 * Get all returned orders
 */
export async function getReturnedOrders(): Promise<{
    success: boolean;
    orders: { id: string; customer_name: string; returned_at: string; return_reason: string; items_restocked: boolean }[];
    error?: string;
}> {
    try {
        const snapshot = await adminDb.collection('orders')
            .where('status', '==', 'RETURNED')
            .orderBy('returned_at', 'desc')
            .limit(50)
            .get();

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customer_name: data.customer?.name || 'Unknown',
                returned_at: data.returned_at?.toDate?.()?.toISOString() || 'Unknown',
                return_reason: data.return_reason || 'No reason provided',
                items_restocked: data.items_restocked || false
            };
        });

        return { success: true, orders };
    } catch (error: any) {
        console.error('[GetReturnedOrders] Error:', error);
        return { success: false, orders: [], error: error.message };
    }
}


// ================================
// DELIVERY STATUS CHECK FUNCTIONS
// ================================

interface DeliveryCheckResult {
    success: boolean;
    orderId: string;
    tracking_no: string;
    status?: string;
    isDelivered: boolean;
    deliveredAt?: string;
    error?: string;
}

interface BatchDeliveryCheckResult {
    success: boolean;
    total: number;
    checked: number;
    delivered: number;
    pending: number;
    failed: number;
    results: DeliveryCheckResult[];
}

/**
 * Get all shipped orders that need delivery status check
 */
export async function getShippedOrdersForDeliveryCheck(): Promise<{
    success: boolean;
    orders: { id: string; tracking_no: string; customer_name: string; shipped_at: string }[];
    error?: string;
}> {
    try {
        const snapshot = await adminDb.collection('orders')
            .where('status', '==', 'SHIPPED')
            .orderBy('shipped_at', 'desc')
            .limit(100)
            .get();

        const orders = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    tracking_no: data.tracking_no,
                    customer_name: data.customer?.name || 'Unknown',
                    shipped_at: data.shipped_at?.toDate?.()?.toISOString() || 'Unknown'
                };
            })
            .filter(order => order.tracking_no);  // Only orders with tracking numbers

        return { success: true, orders };
    } catch (error: any) {
        console.error('[GetShippedOrders] Error:', error);
        return { success: false, orders: [], error: error.message };
    }
}

/**
 * Check delivery status for a single tracking number using ParcelAsia /trace API
 */
export async function traceParcelAsiaShipment(trackingNo: string): Promise<{
    success: boolean;
    status?: string;
    isDelivered: boolean;
    deliveredAt?: string;
    lastUpdate?: string;
    error?: string;
}> {
    const apiKey = process.env.PARCELASIA_API_KEY;

    if (!apiKey) {
        return { success: false, isDelivered: false, error: 'ParcelAsia API key not configured' };
    }

    if (!trackingNo) {
        return { success: false, isDelivered: false, error: 'No tracking number provided' };
    }

    try {
        console.log(`[TraceShipment] Checking status for: ${trackingNo}`);

        const response = await fetch(`${PARCELASIA_API_URL}/trace`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                tracking_no: trackingNo
            })
        });

        const data = await response.json();

        if (data.status === true && data.data) {
            const traceData = data.data;

            // Common delivery status keywords from various couriers
            const deliveryKeywords = [
                'delivered', 'signed', 'received', 'completed', 'arrived',
                'serah', 'terima', 'berjaya', 'dihantar'  // Malay keywords
            ];

            // Check current status for delivery indicators
            const currentStatus = (traceData.current_status || traceData.status || '').toLowerCase();
            const isDelivered = deliveryKeywords.some(keyword => currentStatus.includes(keyword));

            // Get last update time
            const events = traceData.events || traceData.checkpoints || [];
            const lastEvent = events[0];  // Usually most recent first

            return {
                success: true,
                status: traceData.current_status || traceData.status,
                isDelivered,
                deliveredAt: isDelivered ? (lastEvent?.datetime || traceData.delivered_at) : undefined,
                lastUpdate: lastEvent?.description || lastEvent?.status
            };
        } else {
            return {
                success: false,
                isDelivered: false,
                error: data.message || 'Failed to trace shipment'
            };
        }
    } catch (error: any) {
        console.error('[TraceShipment] Error:', error);
        return { success: false, isDelivered: false, error: 'Network error: ' + error.message };
    }
}

/**
 * Check and update delivery status for a single order
 */
export async function checkOrderDeliveryStatus(orderId: string): Promise<DeliveryCheckResult> {
    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return {
                success: false,
                orderId,
                tracking_no: '',
                isDelivered: false,
                error: 'Order not found'
            };
        }

        const order = orderDoc.data();
        const trackingNo = order?.tracking_no;

        if (!trackingNo) {
            return {
                success: false,
                orderId,
                tracking_no: '',
                isDelivered: false,
                error: 'No tracking number'
            };
        }

        // Already delivered?
        if (order?.status === 'DELIVERED') {
            return {
                success: true,
                orderId,
                tracking_no: trackingNo,
                isDelivered: true,
                deliveredAt: order?.delivered_at?.toDate?.()?.toISOString(),
                status: 'Already marked as delivered'
            };
        }

        // Check status via ParcelAsia
        const result = await traceParcelAsiaShipment(trackingNo);

        if (result.success) {
            if (result.isDelivered) {
                // Update order to DELIVERED
                await orderRef.update({
                    status: 'DELIVERED',
                    shipping_status: 'DELIVERED',
                    delivered_at: result.deliveredAt ? new Date(result.deliveredAt) : new Date(),
                    delivery_status_last_check: new Date(),
                    updated_at: new Date()
                });

                console.log(`[DeliveryCheck] Order ${orderId} marked as DELIVERED`);
                return {
                    success: true,
                    orderId,
                    tracking_no: trackingNo,
                    isDelivered: true,
                    deliveredAt: result.deliveredAt,
                    status: result.status
                };
            } else {
                // Still in transit - update last check time
                await orderRef.update({
                    delivery_status_last_check: new Date(),
                    delivery_status_latest: result.status
                });

                return {
                    success: true,
                    orderId,
                    tracking_no: trackingNo,
                    isDelivered: false,
                    status: result.status
                };
            }
        } else {
            return {
                success: false,
                orderId,
                tracking_no: trackingNo,
                isDelivered: false,
                error: result.error
            };
        }
    } catch (error: any) {
        console.error(`[DeliveryCheck] Error for ${orderId}:`, error);
        return {
            success: false,
            orderId,
            tracking_no: '',
            isDelivered: false,
            error: error.message
        };
    }
}

/**
 * Batch check delivery status for all shipped orders
 * Rate limited to avoid API throttling
 */
export async function batchCheckDeliveryStatuses(): Promise<BatchDeliveryCheckResult> {
    const results: DeliveryCheckResult[] = [];
    let checked = 0;
    let delivered = 0;
    let pending = 0;
    let failed = 0;

    try {
        // Get all shipped orders
        const ordersResult = await getShippedOrdersForDeliveryCheck();

        if (!ordersResult.success || ordersResult.orders.length === 0) {
            return {
                success: true,
                total: 0,
                checked: 0,
                delivered: 0,
                pending: 0,
                failed: 0,
                results: []
            };
        }

        console.log(`[BatchDeliveryCheck] Checking ${ordersResult.orders.length} shipped orders...`);

        // Process each order with rate limiting (500ms delay between calls)
        for (const order of ordersResult.orders) {
            const result = await checkOrderDeliveryStatus(order.id);
            results.push(result);
            checked++;

            if (result.success) {
                if (result.isDelivered) {
                    delivered++;
                } else {
                    pending++;
                }
            } else {
                failed++;
            }

            // Rate limiting: wait 500ms between API calls
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[BatchDeliveryCheck] Complete: ${delivered} delivered, ${pending} pending, ${failed} failed`);

        return {
            success: true,
            total: ordersResult.orders.length,
            checked,
            delivered,
            pending,
            failed,
            results
        };
    } catch (error: any) {
        console.error('[BatchDeliveryCheck] Error:', error);
        return {
            success: false,
            total: 0,
            checked,
            delivered,
            pending,
            failed,
            results
        };
    }
}
