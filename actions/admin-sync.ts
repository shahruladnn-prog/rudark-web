'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { Product, ProductVariant } from '@/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

export async function syncLoyverseReceipts(days: number = 1) {
    await requireRole(['owner', 'staff', 'warehouse']);

    const stats = { receipts_processed: 0, items_deducted: 0, errors: [] as string[] };

    try {
        const [settingsDoc, lvPaymentTypesData] = await Promise.all([
            adminDb.doc('settings/payment').get(),
            loyverse.getPaymentTypes().catch(() => ({ payment_types: [] }))
        ]);
        
        const settings = settingsDoc.data();
        const mappings = settings?.loyverse_mappings || {};
        const lvPaymentTypes = lvPaymentTypesData.payment_types || [];
        const lvTypeNameMap = new Map<string, string>();
        lvPaymentTypes.forEach((t: any) => lvTypeNameMap.set(t.id, t.name));

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        let cursor: string | undefined = undefined;
        let allReceipts: any[] = [];

        do {
            const response = await loyverse.getReceipts({ created_at_min: startDate.toISOString(), cursor });
            if (response.receipts) allReceipts = [...allReceipts, ...response.receipts];
            cursor = response.cursor;
        } while (cursor);

        for (const receipt of allReceipts) {
            const eventId = `loyverse_receipt_${receipt.receipt_number}`;
            const orderId = `POS-${receipt.receipt_number}`;
            const eventRef = adminDb.collection('webhook_events').doc(eventId);
            const orderRef = adminDb.collection('orders').doc(orderId);
            
            const [eventDoc, orderDoc] = await Promise.all([eventRef.get(), orderRef.get()]);
            const isMissingData = orderDoc.exists && (!orderDoc.data()?.payment_method || orderDoc.data()?.payment_method === 'OTHER' || (orderDoc.data()?.total_amount || 0) === 0);

            if (eventDoc.exists && orderDoc.exists && !isMissingData) continue;

            try {
                const receiptSkus: string[] = receipt.line_items.map((li: any) => li.sku).filter(Boolean);
                await adminDb.runTransaction(async (transaction) => {
                    if (!eventDoc.exists && receiptSkus.length > 0) {
                        const productsQuery = adminDb.collection('products').where('sku', 'in', receiptSkus.slice(0, 30));
                        const productsSnap = await transaction.get(productsQuery);
                        const productMap = new Map<string, {ref: any, data: Product}>();
                        productsSnap.docs.forEach(doc => productMap.set(doc.data().sku, { ref: doc.ref, data: doc.data() as Product }));

                        for (const lineItem of receipt.line_items) {
                            const match = productMap.get(lineItem.sku);
                            if (!match) continue;
                            const { ref, data: product } = match;
                            const qty = lineItem.quantity;
                            let updatedDoc: any = {};
                            let prevStock = 0; let newStock = 0;

                            const variantIdx = product.variants?.findIndex(v => v.sku === lineItem.sku) ?? -1;
                            if (variantIdx !== -1) {
                                const updatedVariants = [...(product.variants || [])];
                                prevStock = updatedVariants[variantIdx].stock_quantity || 0;
                                newStock = Math.max(0, prevStock - qty);
                                updatedVariants[variantIdx].stock_quantity = newStock;
                                updatedDoc.variants = updatedVariants;
                                updatedDoc.stock_quantity = updatedVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                            } else {
                                prevStock = product.stock_quantity || 0;
                                newStock = Math.max(0, prevStock - qty);
                                updatedDoc.stock_quantity = newStock;
                            }

                            let remainingToDeduct = qty;
                            const updatedLots = [...(product.cost_lots || [])];
                            updatedLots.sort((a, b) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
                            for (const lot of updatedLots) {
                                if (remainingToDeduct <= 0) break;
                                const deduct = Math.min(lot.quantity, remainingToDeduct);
                                lot.quantity -= deduct;
                                remainingToDeduct -= deduct;
                            }
                            updatedDoc.cost_lots = updatedLots.filter(l => l.quantity > 0);
                            const rp = product.reorder_point ?? 5;
                            updatedDoc.stock_status = (updatedDoc.stock_quantity || 0) > 0 ? ((updatedDoc.stock_quantity || 0) <= rp ? 'LOW' : 'IN_STOCK') : 'OUT';
                            updatedDoc.updated_at = FieldValue.serverTimestamp();
                            transaction.update(ref, updatedDoc);

                            transaction.set(adminDb.collection('stock_movements').doc(), {
                                product_id: ref.id, product_name: product.name, variant_sku: lineItem.sku,
                                type: 'SALE', quantity: -qty, previous_quantity: prevStock, new_quantity: newStock,
                                reason: `Loyverse Receipt ${receipt.receipt_number}`, effective_date: new Date(receipt.created_at),
                                created_at: FieldValue.serverTimestamp()
                            });
                        }
                        transaction.set(eventRef, { processed: true, receipt_id: receipt.receipt_number, created_at: FieldValue.serverTimestamp() });
                    }

                    if (!orderDoc.exists || isMissingData) {
                        const totalMoney = parseFloat(receipt.total_money) || 0;
                        const payment = receipt.payments?.[0];
                        let paymentMethodName = payment?.type || 'OTHER';
                        if (payment?.payment_type_id) {
                            paymentMethodName = mappings[payment.payment_type_id] || lvTypeNameMap.get(payment.payment_type_id) || payment.type || 'OTHER';
                        }
                        transaction.set(orderRef, {
                            customer: { name: 'Loyverse Customer', email: 'pos@loyverse.com', phone: '' },
                            items: receipt.line_items.map((li: any) => ({
                                name: li.item_name, sku: li.sku, quantity: li.quantity,
                                price: parseFloat(li.price) || 0, web_price: parseFloat(li.price) || 0,
                                variant_label: li.variant_name || undefined
                            })),
                            total_amount: totalMoney, status: 'COMPLETED', payment_status: 'paid',
                            payment_method: paymentMethodName, type: 'POS',
                            created_at: new Date(receipt.created_at), synced_at: FieldValue.serverTimestamp()
                        }, { merge: true });
                        stats.receipts_processed++;
                    }
                });
            } catch (err: any) {
                stats.errors.push(`Receipt ${receipt.receipt_number}: ${err.message}`);
            }
        }
        revalidatePath('/admin/products');
        return stats;
    } catch (error: any) {
        stats.errors.push(error.message);
        return stats;
    }
}

export async function syncLoyverseItems() {
    await requireRole(['owner', 'staff', 'warehouse']);

    const stats = { created: 0, updated: 0, errors: [] as string[] };
    try {
        const [itemsData, inventoryData] = await Promise.all([loyverse.getItems(), loyverse.getInventory()]);
        const items = itemsData.items || [];
        const inventory = inventoryData.inventory_levels || [];
        const stockMap = new Map<string, number>();
        inventory.forEach((inv: any) => stockMap.set(inv.variant_id, inv.in_stock));

        for (const lvItem of items) {
            try {
                const primarySku = lvItem.variants[0]?.sku;
                if (!primarySku) continue;

                const productQuery = adminDb.collection('products').where('sku', '==', primarySku).limit(1);
                const productSnap = await productQuery.get();
                
                // MAP VARIANTS FIRST
                const variants: ProductVariant[] = lvItem.variants.map((v: any) => {
                    const price = parseFloat(v.price) || 0;
                    return {
                        id: v.variant_id, 
                        sku: v.sku, 
                        price: price, // FORCE CAPTURE
                        stock_status: (stockMap.get(v.variant_id) || 0) > 0 ? 'IN_STOCK' : 'OUT',
                        stock_quantity: stockMap.get(v.variant_id) || 0,
                        options: { 
                            [lvItem.option1_name || 'Option']: v.option1_value, 
                            [lvItem.option2_name || 'Option 2']: v.option2_value, 
                            [lvItem.option3_name || 'Option 3']: v.option3_value 
                        },
                        loyverse_variant_id: v.variant_id
                    };
                }).filter((v: any) => v.sku);

                // Use the FIRST variant price for the parent
                const actualPrice = variants[0]?.price || 0;

                const productData: any = {
                    name: lvItem.item_name, 
                    description: lvItem.description || '',
                    images: lvItem.image_url ? [lvItem.image_url] : [],
                    stock_status: 'IN_STOCK', 
                    updated_at: FieldValue.serverTimestamp(),
                    loyverse_id: lvItem.id, 
                    variants, 
                    web_price: actualPrice, // FORCE PARENT PRICE
                    stock_quantity: variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
                };

                if (!productSnap.empty) {
                    // Force update price even if product exists
                    await productSnap.docs[0].ref.update({
                        ...productData,
                        web_price: actualPrice,
                        variants: variants
                    });
                    stats.updated++;
                } else {
                    productData.sku = primarySku;
                    productData.created_at = FieldValue.serverTimestamp();
                    productData.category_slug = 'uncategorized';
                    productData.is_featured = false;
                    productData.is_public = false;
                    productData.is_home_public = false;
                    productData.tags = [];
                    await adminDb.collection('products').add(productData);
                    stats.created++;
                }
            } catch (err: any) {
                stats.errors.push(`Item ${lvItem.item_name}: ${err.message}`);
            }
        }
        revalidatePath('/admin/products');
        return stats;
    } catch (error: any) {
        stats.errors.push(error.message);
        return stats;
    }
}

export async function fetchLoyverseProductBySku(sku: string) {
    await requireRole(['owner', 'staff', 'warehouse']);

    if (!sku) throw new Error('SKU is required');

    try {
        // 1. Fetch all items (Loyverse doesn't have a direct SKU search in v1.0 /items)
        const itemsData = await loyverse.getItems();
        const items = itemsData.items || [];
        
        // 2. Find the item containing the SKU
        let foundItem: any = null;
        for (const item of items) {
            const hasSku = item.variants.some((v: any) => v.sku === sku);
            if (hasSku) {
                foundItem = item;
                break;
            }
        }

        if (!foundItem) return { success: false, error: 'Product SKU not found in Loyverse' };

        // 3. Fetch inventory for variants
        const variantIds = foundItem.variants.map((v: any) => v.variant_id);
        const inventoryLevels = await loyverse.getVariantInventory(variantIds);
        const stockMap = new Map<string, number>();
        inventoryLevels.forEach((inv: any) => stockMap.set(inv.variant_id, inv.in_stock));

        // 4. Map to our Product format
        const variants: ProductVariant[] = foundItem.variants.map((v: any) => {
            const price = parseFloat(v.price) || 0;
            return {
                id: v.variant_id,
                sku: v.sku,
                price: price,
                stock_quantity: stockMap.get(v.variant_id) || 0,
                stock_status: (stockMap.get(v.variant_id) || 0) > 0 ? 'IN_STOCK' : 'OUT',
                options: {
                    [foundItem.option1_name || 'Option']: v.option1_value,
                    [foundItem.option2_name || 'Option 2']: v.option2_value,
                    [foundItem.option3_name || 'Option 3']: v.option3_value
                },
                loyverse_variant_id: v.variant_id
            };
        });

        const productData = {
            name: foundItem.item_name,
            description: foundItem.description || '',
            web_price: variants[0]?.price || 0,
            variants,
            stock_quantity: variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        };

        return { success: true, data: productData };

    } catch (error: any) {
        console.error('[fetchLoyverseProductBySku] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function syncLoyverseToFirebase() {
    await requireRole(['owner', 'staff', 'warehouse']);

    return { error: "Please use syncLoyverseItems or syncLoyverseReceipts" };
}
