"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseStaleReservations = exports.abandonedCartRecovery = exports.onOrderStatusChange = exports.scheduledFirestoreExport = exports.dailySummaryEmail = exports.checkStock = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const firestore = require("@google-cloud/firestore");
admin.initializeApp();
// Checks stock availability from Loyverse
exports.checkStock = functions.https.onCall(async (data, context) => {
    var _a;
    const { sku, variant_id } = data;
    if (!sku && !variant_id) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "sku" or "variant_id".');
    }
    const LOYVERSE_TOKEN = (_a = functions.config().loyverse) === null || _a === void 0 ? void 0 : _a.token;
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
        const totalStock = inventoryLevels.reduce((sum, level) => sum + level.in_stock, 0);
        return { stock: totalStock, status: totalStock > 0 ? 'IN_STOCK' : 'OUT' };
    }
    catch (error) {
        console.error("checkStock Error:", error);
        throw new functions.https.HttpsError('internal', 'Unable to verify stock.');
    }
});
exports.dailySummaryEmail = functions.pubsub
    .schedule("0 0 * * *") // Runs at 00:00 UTC = 8 AM MYT
    .onRun(async (context) => {
    var _a, _b;
    try {
        // 1. Calculate Yesterday range
        const now = new Date();
        // Start of yesterday (UTC)
        const yesterdayStart = new Date(now);
        yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
        yesterdayStart.setUTCHours(0, 0, 0, 0);
        // End of yesterday (UTC)
        const yesterdayEnd = new Date(now);
        yesterdayEnd.setUTCHours(0, 0, 0, 0);
        console.log(`Summarizing orders from ${yesterdayStart.toISOString()} to ${yesterdayEnd.toISOString()}`);
        // 2. Query Orders
        const ordersSnap = await admin.firestore()
            .collection("orders")
            .where("created_at", ">=", yesterdayStart)
            .where("created_at", "<", yesterdayEnd)
            .get();
        let totalRevenue = 0;
        let orderCount = 0;
        const productStats = {};
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.status === "CANCELLED")
                return;
            orderCount++;
            totalRevenue += (order.total_amount || 0);
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item) => {
                    const name = item.name || "Unknown Product";
                    const revenue = (item.price || 0) * (item.quantity || 0);
                    if (!productStats[name]) {
                        productStats[name] = { revenue: 0, qty: 0 };
                    }
                    productStats[name].revenue += revenue;
                    productStats[name].qty += (item.quantity || 0);
                });
            }
        });
        // 3. Get Top 3 Products
        const topProducts = Object.entries(productStats)
            .map(([name, stats]) => (Object.assign({ name }, stats)))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);
        // 4. Get Store Email
        const settingsSnap = await admin.firestore().collection("settings").doc("general").get();
        const settings = settingsSnap.data();
        const recipientEmail = (settings === null || settings === void 0 ? void 0 : settings.supportEmail) || "admin@rudark.com";
        // 5. Send Email
        const GMAIL_USER = process.env.GMAIL_USER || ((_a = functions.config().gmail) === null || _a === void 0 ? void 0 : _a.user);
        const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || ((_b = functions.config().gmail) === null || _b === void 0 ? void 0 : _b.pass);
        if (!GMAIL_USER || !GMAIL_PASS) {
            console.warn("Gmail credentials not configured. Skipping email.");
            return null;
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_PASS,
            },
        });
        const dateStr = yesterdayStart.toLocaleDateString("en-MY", {
            day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur"
        });
        const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">Rud'Ark Daily Summary</h2>
                    <p style="font-size: 16px;">Summary for <strong>${dateStr}</strong></p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #f9f9f9;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Orders</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${orderCount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Revenue</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">RM ${totalRevenue.toFixed(2)}</td>
                        </tr>
                    </table>

                    <h3>Top 3 Products by Revenue</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #333; color: #fff;">
                                <th style="padding: 10px; text-align: left;">Product</th>
                                <th style="padding: 10px; text-align: center;">Qty</th>
                                <th style="padding: 10px; text-align: right;">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topProducts.map(p => `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.name}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${p.qty}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">RM ${p.revenue.toFixed(2)}</td>
                                </tr>
                            `).join("")}
                            ${topProducts.length === 0 ? '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No sales today</td></tr>' : ""}
                        </tbody>
                    </table>

                    <p style="margin-top: 30px; font-size: 12px; color: #777;">
                        This is an automated report generated by Rud'Ark Command Center.
                    </p>
                </div>
            `;
        await transporter.sendMail({
            from: `"Rud'Ark Summary" <${GMAIL_USER}>`,
            to: recipientEmail,
            subject: `Rud'Ark Daily Summary — ${dateStr}`,
            html: html,
        });
        console.log(`Summary email sent to ${recipientEmail} for ${dateStr}`);
        return null;
    }
    catch (error) {
        console.error("Daily Summary Email Error:", error);
        return null;
    }
});
/**
 * Scheduled Firestore Export
 * Runs daily at 2am Malaysia time
 */
exports.scheduledFirestoreExport = functions.pubsub
    .schedule("0 2 * * *")
    .timeZone("Asia/Kuala_Lumpur")
    .onRun(async (context) => {
    const client = new firestore.v1.FirestoreAdminClient();
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
    const databaseName = client.databasePath(projectId, "(default)");
    const date = new Date().toISOString().split("T")[0];
    const outputUriPrefix = `gs://${projectId}-backups/firestore/${date}`;
    try {
        await client.exportDocuments({
            name: databaseName,
            outputUriPrefix: outputUriPrefix,
            collectionIds: [], // Export all collections
        });
        console.log(`Firestore export triggered successfully to ${outputUriPrefix}`);
        return null;
    }
    catch (error) {
        console.error("Firestore export failed:", error);
        return null;
    }
});
/**
 * Order Status Change Notification
 * Sends an email to the customer when their order status is updated.
 */
exports.onOrderStatusChange = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status)
        return null;
    const customerEmail = (_a = after.customer) === null || _a === void 0 ? void 0 : _a.email;
    if (!customerEmail) {
        console.warn(`No customer email found for order ${context.params.orderId}. Skipping notification.`);
        return null;
    }
    const GMAIL_USER = process.env.GMAIL_USER || ((_b = functions.config().gmail) === null || _b === void 0 ? void 0 : _b.user);
    const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || ((_c = functions.config().gmail) === null || _c === void 0 ? void 0 : _c.pass);
    if (!GMAIL_USER || !GMAIL_PASS) {
        console.warn("Gmail credentials not configured. Skipping order notification.");
        return null;
    }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    const orderId = context.params.orderId;
    let subject = "";
    let headline = "";
    let body = "";
    switch (after.status) {
        case "PAID":
            subject = `Order Confirmed — ${orderId}`;
            headline = "Your order is confirmed";
            body = `
                    <p>Thank you for your purchase! We've received your payment and are preparing your gear.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #333;">
                                <th style="text-align: left; padding: 8px;">Item</th>
                                <th style="text-align: center; padding: 8px;">Qty</th>
                                <th style="text-align: right; padding: 8px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(after.items || []).map((item) => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px;">${item.name}</td>
                                    <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                                    <td style="padding: 8px; text-align: right;">RM ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 8px; text-align: right;"><strong>Total Paid:</strong></td>
                                <td style="padding: 8px; text-align: right;"><strong>RM ${(after.total_amount || 0).toFixed(2)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                `;
            break;
        case "SHIPPED":
            subject = `Gear on the way — ${orderId}`;
            headline = "Your order is on the way";
            body = `
                    <p>Great news! Your gear has been dispatched and is currently in transit.</p>
                    ${after.tracking_no ? `
                        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #333; margin: 20px 0;">
                            <p style="margin: 0; font-size: 14px;"><strong>Tracking Number:</strong></p>
                            <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #000;">${after.tracking_no}</p>
                        </div>
                    ` : ""}
                `;
            break;
        case "DELIVERED":
            subject = `Gear Delivered — ${orderId}`;
            headline = "Your order has arrived";
            body = `
                    <p>Our records show that your order has been successfully delivered. We hope you're ready for aquatic dominance.</p>
                    <p>Thank you for choosing Rud'Ark.</p>
                `;
            break;
        case "CANCELLED":
            subject = `Order Update — ${orderId}`;
            headline = "Your order has been cancelled";
            body = `
                    <p>Your order ${orderId} has been cancelled. If a payment was already made, a refund will be processed to your original payment method shortly.</p>
                    <p>If you have any questions, please contact our support team.</p>
                `;
            break;
        default:
            // No email for other statuses
            return null;
    }
    const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; color: #333;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="text-transform: uppercase; letter-spacing: 2px; margin: 0;">Rud'Ark</h1>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">TECHNICAL AQUATIC GEAR</p>
                </div>
                <h2 style="font-style: italic; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">${headline}</h2>
                <p>Order ID: <strong>${orderId}</strong></p>
                ${body}
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
                    <p>&copy; ${new Date().getFullYear()} Rud'Ark Pro Shop. All rights reserved.</p>
                </div>
            </div>
        `;
    try {
        await transporter.sendMail({
            from: `"Rud'Ark Pro Shop" <${GMAIL_USER}>`,
            to: customerEmail,
            subject: subject,
            html: html,
        });
        console.log(`Status update email sent to ${customerEmail} for order ${orderId} (Status: ${after.status})`);
    }
    catch (error) {
        console.error("Error sending order status email:", error);
    }
    return null;
});
/**
 * Abandoned Cart Recovery
 * Runs every hour to check for PENDING orders that were created > 1 hour ago
 * but less than 24 hours ago, and sends a reminder email.
 */
exports.abandonedCartRecovery = functions.pubsub
    .schedule("0 * * * *") // Runs every hour
    .onRun(async (context) => {
    var _a, _b;
    // DISABLED — see TASKS 5.5. The recovery email pointed at /checkout, but the
    // cart lives in localStorage, so customers landed on an empty page. Re-enable
    // once a resume-cart server-side path is built.
    console.log("[abandonedCartRecovery] disabled, returning early");
    return null;
    const now = Date.now();
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    try {
        const ordersSnap = await admin.firestore()
            .collection("orders")
            .where("status", "==", "PENDING")
            .where("created_at", "<=", oneHourAgo)
            .where("created_at", ">", twentyFourHoursAgo)
            .get();
        if (ordersSnap.empty) {
            console.log("No abandoned carts found in the last hour.");
            return null;
        }
        const GMAIL_USER = process.env.GMAIL_USER || ((_a = functions.config().gmail) === null || _a === void 0 ? void 0 : _a.user);
        const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || ((_b = functions.config().gmail) === null || _b === void 0 ? void 0 : _b.pass);
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rudark-web.vercel.app";
        if (!GMAIL_USER || !GMAIL_PASS) {
            console.warn("Gmail credentials not configured. Skipping abandoned cart recovery.");
            return null;
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        });
        const emailPromises = ordersSnap.docs.map(async (doc) => {
            var _a;
            const order = doc.data();
            // Skip if already sent
            if (order.abandoned_email_sent === true)
                return;
            const customerEmail = (_a = order.customer) === null || _a === void 0 ? void 0 : _a.email;
            if (!customerEmail)
                return;
            const orderId = doc.id;
            const subject = "You left something behind — complete your Rud'Ark order";
            const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; color: #333;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="text-transform: uppercase; letter-spacing: 2px; margin: 0;">Rud'Ark</h1>
                            <p style="font-size: 12px; color: #666; margin-top: 5px;">TECHNICAL AQUATIC GEAR</p>
                        </div>
                        <h2 style="font-style: italic; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">You left something behind</h2>
                        <p>We noticed you were in the middle of an order. Your gear is still waiting for you.</p>
                        
                        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Order ID: ${orderId}</strong></p>
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                ${(order.items || []).map((item) => `
                                    <tr>
                                        <td style="padding: 5px 0;">${item.name} x ${item.quantity}</td>
                                        <td style="padding: 5px 0; text-align: right;">RM ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                    </tr>
                                `).join("")}
                                <tr style="border-top: 1px solid #ddd;">
                                    <td style="padding: 10px 0 0 0;"><strong>Total:</strong></td>
                                    <td style="padding: 10px 0 0 0; text-align: right;"><strong>RM ${(order.total_amount || 0).toFixed(2)}</strong></td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${BASE_URL}/checkout?order_id=${orderId}" style="background: #000; color: #fff; text-decoration: none; padding: 15px 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Complete Checkout</a>
                        </div>

                        <p style="font-size: 12px; color: #777;">If you've already completed this order under a different email, please ignore this message.</p>

                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
                            <p>&copy; ${new Date().getFullYear()} Rud'Ark Pro Shop. All rights reserved.</p>
                        </div>
                    </div>
                `;
            await transporter.sendMail({
                from: `"Rud'Ark Pro Shop" <${GMAIL_USER}>`,
                to: customerEmail,
                subject: subject,
                html: html,
            });
            await doc.ref.update({ abandoned_email_sent: true });
            console.log(`Abandoned cart email sent to ${customerEmail} for order ${orderId}`);
        });
        await Promise.all(emailPromises);
        return null;
    }
    catch (error) {
        console.error("Abandoned Cart Recovery Error:", error);
        return null;
    }
});
/**
 * Release Stale Reservations
 * Runs every 30 minutes to release stock from PENDING orders older than 30 minutes.
 * Fixes C6: Stock leak from unredeemed PENDING orders.
 */
exports.releaseStaleReservations = functions.pubsub
    .schedule("*/30 * * * *")
    .onRun(async (context) => {
    const now = Date.now();
    const thirtyMinsAgo = new Date(now - 30 * 60 * 1000);
    try {
        const ordersSnap = await admin.firestore()
            .collection("orders")
            .where("status", "==", "PENDING")
            .where("created_at", "<=", thirtyMinsAgo)
            .get();
        if (ordersSnap.empty) {
            console.log("No stale reservations found.");
            return null;
        }
        let releasedCount = 0;
        for (const doc of ordersSnap.docs) {
            const order = doc.data();
            await admin.firestore().runTransaction(async (tx) => {
                var _a, _b, _c;
                // Double check status
                const currentDoc = await tx.get(doc.ref);
                if (((_a = currentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'PENDING')
                    return;
                // Release stock
                if (order.items && Array.isArray(order.items)) {
                    for (const item of order.items) {
                        if (!item.id)
                            continue;
                        const productRef = admin.firestore().collection('products').doc(item.id);
                        const productDoc = await tx.get(productRef);
                        if (productDoc.exists) {
                            const product = productDoc.data();
                            if (!product)
                                return;
                            let updatedDoc = {};
                            let newReserved = Math.max(0, (product.reserved_quantity || 0) - item.quantity);
                            const variantIdx = (_c = (_b = product.variants) === null || _b === void 0 ? void 0 : _b.findIndex((v) => v.sku === item.sku)) !== null && _c !== void 0 ? _c : -1;
                            if (variantIdx !== -1) {
                                const updatedVariants = [...(product.variants || [])];
                                const variant = updatedVariants[variantIdx];
                                updatedVariants[variantIdx].reserved_quantity = Math.max(0, (variant.reserved_quantity || 0) - item.quantity);
                                updatedDoc.variants = updatedVariants;
                                updatedDoc.reserved_quantity = updatedVariants.reduce((sum, v) => sum + (v.reserved_quantity || 0), 0);
                            }
                            else {
                                updatedDoc.reserved_quantity = newReserved;
                            }
                            tx.update(productRef, updatedDoc);
                        }
                    }
                }
                // Mark as EXPIRED
                tx.update(doc.ref, {
                    status: 'EXPIRED',
                    expired_at: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            releasedCount++;
        }
        console.log(`Released stock for ${releasedCount} stale orders.`);
        return null;
    }
    catch (error) {
        console.error("Release Stale Reservations Error:", error);
        return null;
    }
});
//# sourceMappingURL=index.js.map