'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { Product, CartItem } from '@/types';

export async function recordManualPOSSale(data: {
    items: CartItem[];
    payment_method: string;
    sale_date: string; // ISO string
    customer_notes?: string;
    total_amount: number;
}) {
    await requireRole(['owner', 'staff']);

    try {
        const effectiveDate = new Date(data.sale_date);
        
        await adminDb.runTransaction(async (transaction) => {
            for (const item of data.items) {
                if (!item.id) continue;
                
                const productRef = adminDb.collection('products').doc(item.id);
                const productDoc = await transaction.get(productRef);
                
                if (!productDoc.exists) continue;
                
                const product = productDoc.data() as Product;
                const qty = item.quantity;
                
                // 1. Identify Target (Parent or Variant)
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                const hasVariants = product.variants && product.variants.length > 0;

                let updatedDoc: Partial<Product> = {};
                let prevStock = 0;
                let newStock = 0;

                if (hasVariantOptions && hasVariants) {
                    const variantIndex = product.variants!.findIndex((v: any) => {
                        return Object.entries(item.selected_options!).every(
                            ([key, value]) => v.options[key] === value
                        );
                    });

                    if (variantIndex !== -1) {
                        const updatedVariants = [...product.variants!];
                        const variant = updatedVariants[variantIndex];
                        prevStock = variant.stock_quantity || 0;
                        newStock = Math.max(0, prevStock - qty);
                        
                        updatedVariants[variantIndex] = {
                            ...variant,
                            stock_quantity: newStock
                        };
                        
                        updatedDoc.variants = updatedVariants;
                        updatedDoc.stock_quantity = updatedVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                    }
                } else {
                    prevStock = product.stock_quantity || 0;
                    newStock = Math.max(0, prevStock - qty);
                    updatedDoc.stock_quantity = newStock;
                }

                // 2. FIFO Cost Deduction (Phase 4)
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

                // 3. Update Status
                const rp = product.reorder_point ?? 5;
                updatedDoc.stock_status = (updatedDoc.stock_quantity || 0) > 0 
                    ? ((updatedDoc.stock_quantity || 0) <= rp ? 'LOW' : 'IN_STOCK') 
                    : 'OUT';
                
                updatedDoc.updated_at = FieldValue.serverTimestamp();

                transaction.update(productRef, updatedDoc);

                // 4. Record Stock Movement
                const movementRef = adminDb.collection('stock_movements').doc();
                transaction.set(movementRef, {
                    product_id: item.id,
                    product_name: product.name,
                    variant_label: item.variant_label,
                    type: 'SALE',
                    quantity: -qty,
                    previous_quantity: prevStock,
                    new_quantity: newStock,
                    reason: 'Manual POS Entry',
                    reference: `POS-${effectiveDate.getTime()}`,
                    effective_date: effectiveDate,
                    created_at: FieldValue.serverTimestamp()
                });
            }

            // 5. Create Order Record
            const orderRef = adminDb.collection('orders').doc();
            transaction.set(orderRef, {
                items: data.items,
                total_amount: data.total_amount,
                payment_method: data.payment_method,
                status: 'PAID',
                type: 'POS',
                notes: data.customer_notes,
                created_at: effectiveDate, // Back-dated order date
                recorded_at: FieldValue.serverTimestamp()
            });
        });

        revalidatePath('/admin/products');
        revalidatePath('/admin/orders');
        return { success: true };
    } catch (error: any) {
        console.error('[recordManualPOSSale] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getProductsForPOS() {
    await requireRole(['owner', 'staff']);

    const snapshot = await adminDb.collection('products')
        .where('stock_status', '!=', 'ARCHIVED')
        .get();
    
    return snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            name: d.name,
            sku: d.sku,
            web_price: d.web_price,
            promo_price: d.promo_price,
            variants: d.variants || [],
            stock_quantity: d.stock_quantity
        };
    });
}
