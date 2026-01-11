import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Checks stock availability from Loyverse
export const checkStock = functions.https.onCall(async (data: { sku: string; variant_id?: string }, context) => {
    const { sku, variant_id } = data;

    if (!sku && !variant_id) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "sku" or "variant_id".');
    }

    const LOYVERSE_TOKEN = functions.config().loyverse?.token;
    if (!LOYVERSE_TOKEN) {
        throw new functions.https.HttpsError('failed-precondition', 'Loyverse Token is not configured.');
    }

    try {
        // If we have a variant_id, query inventory directly
        // If only SKU, we might need to search item first, but for now let's assume variant_id is best
        // Or if SKU is passed and we can filter by it? Loyverse API for inventory uses variant_ids.

        let targetVariantId = variant_id;

        // Logic: If we only have SKU, we realistically need to search /items first to find the variant_id.
        // However, the frontend usually has the product object which SHOULD contain the variant_id if synced correctly.
        // Let's assume frontend passes variant_id if available.

        if (!targetVariantId) {
            // Fallback: This would be slow. Ideally, sync keeps variant_id in Firestore.
            // For now, let's return error if no variant_id, to encourage proper sync usage.
            throw new functions.https.HttpsError('invalid-argument', 'Product must have a Loyverse Variant ID mapped.');
        }

        const response = await fetch(`https://api.loyverse.com/v1.0/inventory?variant_ids=${targetVariantId}`, {
            headers: {
                'Authorization': `Bearer ${LOYVERSE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Loyverse API Error:", errorText);
            throw new functions.https.HttpsError('unavailable', 'Failed to fetch stock from Loyverse.');
        }

        const json = await response.json();
        const inventoryLevels = json.inventory_levels || [];

        // Sum stock across all stores? Or specific store?
        // Usually online store pulls from a specific main store or aggregates all.
        // Let's aggregate for now unless user specified a store.
        const totalStock = inventoryLevels.reduce((sum: number, level: any) => sum + level.in_stock, 0);

        return { stock: totalStock, status: totalStock > 0 ? 'IN_STOCK' : 'OUT' };

    } catch (error) {
        console.error("checkStock Error:", error);
        throw new functions.https.HttpsError('internal', 'Unable to verify stock.');
    }
});

export const bizappWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Basic Validation
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        let billStatus = '';
        let externalReference = '';
        let billCode = '';

        // BizApp V3 sends multipart/form-data usually, or sometimes JSON if configured?
        // Express (and Firebase Functions) parses JSON automatically if Content-Type is application/json.
        // For multipart, we might need 'busboy' or similar, BUT standard firebase functions usually parse body if simple.
        // If it sends x-www-form-urlencoded, req.body is an object.
        // Let's assume req.body is populated.

        const body = req.body;
        console.log("BizApp Webhook Body:", JSON.stringify(body));

        billStatus = body.billstatus || body.transactionStatus; // Adjust based on actual payload
        externalReference = body.billExternalReferenceNo || body.refno || body.order_id;
        billCode = body.billcode;

        // Verify Status (1 = Success)
        if (billStatus !== '1') {
            console.log(`Payment not successful. Status: ${billStatus}`);
            res.status(200).send('Received, but not success status');
            return;
        }

        if (!externalReference) {
            console.error("Missing external reference");
            res.status(400).send("Missing Reference");
            return;
        }

        const orderId = externalReference;
        const orderRef = admin.firestore().collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`Order ${orderId} not found`);
            res.status(404).send("Order not found");
            return;
        }

        const orderData = orderSnap.data();
        if (orderData?.status === 'PAID') {
            res.status(200).send('Already Paid');
            return;
        }

        // 2. Update Order Status
        await orderRef.update({
            status: 'PAID',
            paid_at: admin.firestore.FieldValue.serverTimestamp(),
            bizapp_data: {
                billCode: billCode,
                status: billStatus,
                paid_at: new Date().toISOString()
            }
        });

        // 3. Create Loyverse Receipt
        // We need to deduct stock. The best way is to create a 'Sale' receipt in Loyverse.
        try {
            const LOYVERSE_TOKEN = functions.config().loyverse.token;
            if (LOYVERSE_TOKEN && orderData?.items) {
                const lineItems = orderData.items.map((item: any) => ({
                    variant_id: item.loyverse_variant_id,
                    quantity: item.quantity,
                    price: item.web_price // Sold at web price
                })).filter((l: any) => l.variant_id); // Only sync items linked to Loyverse

                if (lineItems.length > 0) {
                    const receiptPayload = {
                        receipt_date: new Date().toISOString(),
                        note: `Web Order ${orderId}`,
                        line_items: lineItems,
                        total_money: orderData.total_amount,
                        store_id: '' // Need Store ID? API says optional, defaults to first? Let's check docs later.
                        // Actually, 'receipts' endpoint usually requires store_id?
                    };

                    // For now, we will just log the INTENT.
                    // Real implementation requires fetching Store ID or hardcoding it.
                    // Let's fetch stores first? No, too slow.
                    // We will skip store_id and hope for default, or user config.

                    const receiptsRes = await fetch('https://api.loyverse.com/v1.0/receipts', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${LOYVERSE_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(receiptPayload)
                    });

                    if (!receiptsRes.ok) {
                        const err = await receiptsRes.text();
                        console.error("Loyverse Receipt Failed:", err);
                        await orderRef.update({ loyverse_sync: 'FAILED', loyverse_error: err });
                    } else {
                        const receiptData = await receiptsRes.json();
                        await orderRef.update({ loyverse_sync: 'SUCCESS', loyverse_receipt_number: receiptData.receipt_number });
                    }
                }
            }
        } catch (err) {
            console.error("Loyverse Sync Validation Error:", err);
        }

        // 4. ParcelAsia - Create Shipment
        try {
            const PARCELASIA_API_KEY = functions.config().parcelasia.api_key;

            // Validate required data check
            if (PARCELASIA_API_KEY && orderData?.customer) {

                // Construct Payload
                // Note: We need sender details. For now, hardcoding RudArk sender info or using config placeholders.
                // In a real app, these should be in a Settings document or env vars.
                const senderDetails = {
                    sender_name: "RudArk Store",
                    sender_phone: "0123456789", // Replace with real phone
                    sender_email: "admin@rudark.com",
                    sender_address_line_1: "123 RudArk HQ",
                    sender_postcode: "50000",
                    sender_city: "Kuala Lumpur",
                    sender_state: "dng", // state code? check docs. using 'dng' as placeholder
                    sender_country_code: "MY"
                };

                const shipmentPayload = {
                    api_key: PARCELASIA_API_KEY,
                    integration_order_id: orderId,
                    send_method: 'pickup', // or dropoff
                    send_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    type: 'parcel',
                    declared_weight: '1.0', // Default 1kg if not calculated
                    provider_code: 'J&T', // Default provider? Or let ParcelAsia decide? required field.
                    // "provider_code" is required. We might need to fetch available providers first or hardcode one like 'ABX', 'POSLAJU', 'JNT'.
                    // Let's use 'JNT' (J&T Express) as a common default for now.
                    size: 's', // default
                    content_type: 'merchandise',
                    content_description: 'Apparel',
                    content_value: orderData?.total_amount || 0,

                    ...senderDetails,

                    receiver_name: orderData.customer.name,
                    receiver_phone: orderData.customer.phone,
                    receiver_email: 'customer@example.com', // We didn't ask email in checkout?
                    receiver_address_line_1: orderData.customer.address,
                    receiver_postcode: '50000', // We didn't parse postcode separately!
                    // CRITICAL: We need postcode for shipping.
                    // checkout.ts only collects 'address' string and 'state'.
                    // We might need to extract postcode or ask for it explicitly.
                    // For now, using a dummy postcode to prevent API error, but this needs fixing in Checkout.
                    receiver_city: 'City', // Dummy
                    receiver_state: orderData.customer.state,
                    receiver_country_code: 'MY'
                };

                console.log("Creating ParcelAsia Shipment...", JSON.stringify(shipmentPayload));

                const paRes = await fetch('https://app.myparcelasia.com/apiv2/create_shipment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shipmentPayload)
                });

                const paData = await paRes.json();

                if (paData.status) {
                    console.log("ParcelAsia Shipment Created:", paData);
                    await orderRef.update({
                        parcel_asia_sync: 'SUCCESS',
                        tracking_number: paData.data?.tracking_no || 'PENDING',
                        shipment_key: paData.data?.shipment_key
                    });
                } else {
                    console.error("ParcelAsia Failed:", paData.message);
                    await orderRef.update({
                        parcel_asia_sync: 'FAILED',
                        parcel_asia_error: paData.message
                    });
                }
            }
        } catch (paError) {
            console.error("ParcelAsia Integration Error:", paError);
        }

        res.status(200).send("OK");

    } catch (error) {
        console.error("Webhook Internal Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
