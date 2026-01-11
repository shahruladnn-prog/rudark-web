'use server';

import { getSettings } from './settings-actions';

interface ShippingRate {
    provider_code: string;
    provider_name: string;
    price: number;
    service_type: string;
    estimated_days?: string;
    send_dates?: string[]; // Available send dates from courier
}

interface ShippingResponse {
    success: boolean;
    rates?: ShippingRate[];
    error?: string;
    debugData?: any; // For debugging on client
}

const PARCELASIA_API_URL = 'https://app.myparcelasia.com/apiv2';
// Default Sender Postcode (Rudark HQ/Warehouse) - Should ideally be in settings
const DEFAULT_SENDER_POSTCODE = '40150';

export async function checkShippingRates(receiverPostcode: string, weightKg: number): Promise<ShippingResponse> {
    const apiKey = process.env.PARCELASIA_API_KEY;

    if (!apiKey) {
        console.error("PARCELASIA_API_KEY is missing");
        return { success: false, error: "Shipping configuration error" };
    }

    if (!receiverPostcode || weightKg <= 0) {
        return { success: false, error: "Invalid shipping parameters" };
    }

    try {
        const payload = {
            api_key: apiKey,
            sender_postcode: DEFAULT_SENDER_POSTCODE,
            receiver_postcode: receiverPostcode,
            declared_weight: weightKg,
            receiver_country_code: 'MY' // Default to Malaysia for now
        };

        const response = await fetch(`${PARCELASIA_API_URL}/check_price`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store' // Important: real-time rates
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("ParcelAsia Response:", JSON.stringify(data, null, 2));

        if (data.status === false || !data.data) {
            console.error("ParcelAsia Error:", data.message);
            return { success: false, error: data.message || "No rates found" };
        }

        // Transform API response to our simpler interface
        // API Docs: response.data.prices = [ { ... }, { ... } ]
        const rawRates = data.data?.prices || [];

        const ALLOWED_PROVIDERS = ['jnt', 'poslaju'];

        const rates: ShippingRate[] = rawRates.map((rate: any) => {
            // Price is string in API (e.g. "5.00")
            // specific fields: effective_price (promo), normal_price (standard)
            const priceString = rate.effective_price || rate.normal_price || rate.price || "0";
            const parsedPrice = parseFloat(priceString);

            return {
                provider_code: rate.provider_code,
                provider_name: rate.provider_label || rate.provider_name || rate.provider_code,
                price: isNaN(parsedPrice) ? 0 : parsedPrice,
                service_type: rate.service_type || rate.type || 'Standard',
                estimated_days: rate.transit_time || rate.estimated_days || '2-5 Days', // API uses 'transit_time'
                // Add send_dates for createShipment to use
                send_dates: rate.send_dates || []
            };
        }).filter((rate: ShippingRate) => rate.price > 0 && ALLOWED_PROVIDERS.includes(rate.provider_code.toLowerCase()));

        console.log("Parsed Rates:", rates);

        // Sort by price cheapest first
        rates.sort((a, b) => a.price - b.price);

        if (rates.length === 0) {
            return {
                success: false,
                error: "No valid shipping rates found.",
                debugData: rawRates // Return raw API rates for debugging
            };
        }

        return { success: true, rates };

    } catch (error: any) {
        console.error("Shipping Rate Check Failed:", error);
        return { success: false, error: "Failed to calculate shipping rates" };
    }
}

export async function createShipment(order: any) {
    const apiKey = process.env.PARCELASIA_API_KEY;
    if (!apiKey) throw new Error("Missing ParcelAsia API Key");

    // Get store settings for sender details
    const settings = await getSettings();

    // Get send_date: Use tomorrow's date in Malaysia timezone
    // This ensures we never use "today" which might be in the past for the courier
    const now = new Date();
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Add 1 day
    const sendDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(tomorrow);

    console.log(`[CreateShipment] Using send_date: ${sendDate} (tomorrow in Malaysia time)`);

    // DYNAMIC CONTENT MAPPING
    const items = order.items || [];
    const totalWeight = items.reduce((sum: number, item: any) => sum + ((item.weight || 0.1) * item.quantity), 0);
    const contentDescription = items.map((i: any) => i.name).join(', ').substring(0, 50); // Limit length
    const contentType = items[0]?.content_type || 'general'; // Default to first item's type

    // Determine Parcel Size & Dimensions
    // Logic: If any item is 'box', entire shipment is 'box'. Else largest flyer.
    let parcelSize = 'flyers_m'; // Default
    let dimensions = { width: 10, length: 10, height: 10 }; // Defaults

    const hasBox = items.some((i: any) => i.parcel_size === 'box');
    if (hasBox) {
        parcelSize = 'box';
        // Simple logic: Take max dimensions of items roughly or default
        // In a real bin-packing scenario this is complex, but here we take the largest single dimension found
        dimensions = items.reduce((max: any, i: any) => ({
            width: Math.max(max.width, i.width || 10),
            length: Math.max(max.length, i.length || 10),
            height: Math.max(max.height, i.height || 10)
        }), { width: 10, length: 10, height: 10 });
    } else {
        // If not box, find largest flyer
        const sizePriority = ['flyers_s', 'flyers_m', 'flyers_l', 'flyers_xl'];
        let maxIdx = 1; // Start at M
        items.forEach((i: any) => {
            const idx = sizePriority.indexOf(i.parcel_size);
            if (idx > maxIdx) maxIdx = idx;
        });
        parcelSize = sizePriority[maxIdx];
    }

    // Parse City/State if combined
    let finalCity = order.customer.city || "Unknown";
    let finalState = order.customer.state || "Unknown";

    if (finalCity.includes(',')) {
        const parts = finalCity.split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
            finalCity = parts[0];
            finalState = parts[1];
        }
    }

    // Helpers
    const cleanPhone = (p: string) => {
        let phone = p.replace(/[^0-9]/g, '');
        if (phone.startsWith('60')) {
            phone = '0' + phone.substring(2);
        }
        return phone;
    };
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    finalCity = toTitleCase(finalCity);
    finalState = toTitleCase(finalState);

    // FLATTENED PAYLOAD (Removing City/State to rely on Postcode)
    const payload: any = {
        api_key: apiKey,
        send_method: settings.send_method || "pickup",
        send_date: sendDate,
        type: "parcel",
        declared_weight: Number((totalWeight > 0 ? totalWeight : 1.0).toFixed(3)),
        provider_code: (order.shipping_provider || '').toLowerCase(),

        // Content Details
        content_type: contentType,
        content_description: contentDescription || "Tactical Gear",
        content_value: Number((order.total_amount || 50).toFixed(2)),

        // Parcel Size
        size: parcelSize,

        // Sender Details (from store settings)
        sender_name: settings.storeName || "Rud'Ark Shop",
        sender_phone: cleanPhone(settings.phone || "01124077231"),
        sender_email: settings.supportEmail || "rudark.my@gmail.com",
        sender_address_line_1: settings.address_line_1 || "LOT 10846",
        sender_address_line_2: settings.address_line_2 || "Jalan Besar, Kampung Chulek",
        sender_address_line_3: "",
        sender_address_line_4: "",
        sender_postcode: settings.postcode || "31600",
        // sender_city: "Gopeng",
        // sender_state: "Perak",
        // sender_country_code: "MY",

        // Receiver Details
        receiver_name: order.customer.name,
        receiver_phone: cleanPhone(order.customer.phone),
        receiver_email: order.customer.email,
        receiver_address_line_1: order.customer.address,
        receiver_address_line_2: "",
        receiver_address_line_3: "",
        receiver_address_line_4: "",
        receiver_postcode: order.customer.postcode,
        // receiver_city: finalCity,
        // receiver_state: finalState,
        // receiver_country_code: "MY",

        // Reference
        integration_order_id: order.id
    };

    // Add dimensions ONLY if box
    if (parcelSize === 'box') {
        payload.width = dimensions.width;
        payload.length = dimensions.length;
        payload.height = dimensions.height;
    }

    try {
        console.log(`[CreateShipment] Payload provider_code: '${payload.provider_code}'`);
        console.log(`[CreateShipment] Full Payload:`, JSON.stringify(payload, null, 2));

        const response = await fetch(`${PARCELASIA_API_URL}/create_shipment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Check for success status (User docs show "status": true)
        if (data.status === true && data.data) {
            // Response data structure might directly be the shipment details or inside data array?
            // User docs response example: "data": { "shipment_status": "complete", ... } -> It's an object, not array?
            // But my previous log showed "data": [] on failure.
            // Let's assume data contains tracking info directly or we need to parse it.
            // Docs Response Example: "data": { "tracking_no": ..., "shipment_key": ... } (Actually docs don't show tracking_no in root data, wait)
            // Docs Example Response: "data": { ... "shipment_key": "..." } 
            // It does NOT explicitly show "tracking_no" in the example data block provided, but implies success.
            // We'll trust "shipment_status" or similar. 
            // IMPORTANT: Previous working code expected `data.data[0].tracking_no`. 
            // If payload is flat, maybe response is flat object too? 
            // Let's safe access.

            const trackingNo = data.data.tracking_no || data.data.shipment_key || "PENDING";
            const shipmentId = data.data.shipment_id || data.data.shipment_key || "UNKNOWN";

            return {
                success: true,
                tracking_no: trackingNo,
                shipment_id: shipmentId
            };
        } else {
            console.error("ParcelAsia CreateShipment Failed:", data);
            return { success: false, error: data.message || "Unknown API Error" };
        }
    } catch (error) {
        console.error("CreateShipment Error:", error);
        return { success: false, error: "Network error" };
    }
}
