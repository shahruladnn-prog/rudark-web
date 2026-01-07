'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

export interface PromoCode {
    id?: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    min_spend?: number;
    usage_limit?: number;
    usage_count: number;
    active: boolean;
    created_at?: string;
}

export async function getPromos() {
    try {
        const snapshot = await adminDb.collection('promos').orderBy('created_at', 'desc').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.().toISOString() || null
            };
        });
    } catch (error) {
        console.error('Fetch promos error:', error);
        return [];
    }
}

export async function getPromo(id: string) {
    try {
        const doc = await adminDb.collection('promos').doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.().toISOString() || null
        };
    } catch (error) {
        return null;
    }
}

export async function savePromo(data: any) {
    try {
        const { id, ...payload } = data;

        // Ensure code is uppercase and trimmed
        payload.code = payload.code.toUpperCase().trim();
        payload.value = Number(payload.value);
        if (payload.min_spend) payload.min_spend = Number(payload.min_spend);
        if (payload.usage_limit) payload.usage_limit = Number(payload.usage_limit);

        if (id && id !== 'new') {
            await adminDb.collection('promos').doc(id).update({
                ...payload,
                updated_at: new Date()
            });
        } else {
            // Check for duplicates
            const existing = await adminDb.collection('promos').where('code', '==', payload.code).get();
            if (!existing.empty) {
                return { success: false, error: 'Promo code already exists' };
            }

            await adminDb.collection('promos').add({
                ...payload,
                usage_count: 0,
                active: true,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        revalidatePath('/admin/promos');
        return { success: true };
    } catch (error) {
        console.error('Save promo error:', error);
        return { success: false, error: 'Failed to save promo' };
    }
}

export async function deletePromo(id: string) {
    try {
        await adminDb.collection('promos').doc(id).delete();
        revalidatePath('/admin/promos');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete' };
    }
}

export async function togglePromoStatus(id: string, currentStatus: boolean) {
    try {
        await adminDb.collection('promos').doc(id).update({ active: !currentStatus });
        revalidatePath('/admin/promos');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to toggle status' };
    }
}
export async function validatePromoCode(code: string, cartTotal: number) {
    try {
        const normalizedCode = code.toUpperCase().trim();
        const snapshot = await adminDb.collection('promos').where('code', '==', normalizedCode).limit(1).get();

        if (snapshot.empty) {
            return { valid: false, message: 'Invalid promo code' };
        }

        const promo = snapshot.docs[0].data() as PromoCode;
        const promoId = snapshot.docs[0].id;

        if (!promo.active) {
            return { valid: false, message: 'This promo code is inactive' };
        }

        if (promo.usage_limit && promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit) {
            return { valid: false, message: 'Promo code usage limit reached' };
        }

        if (promo.min_spend && cartTotal < promo.min_spend) {
            return { valid: false, message: `Minimum spend of RM${promo.min_spend} required` };
        }

        let discountAmount = 0;
        if (promo.type === 'percentage') {
            discountAmount = (cartTotal * promo.value) / 100;
        } else {
            discountAmount = promo.value;
        }

        // Cap discount at cart total (no negative total)
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        return {
            valid: true,
            discountAmount,
            code: promo.code,
            type: promo.type,
            value: promo.value
        };

    } catch (error) {
        console.error('Validate promo error:', error);
        return { valid: false, message: 'Error validating code' };
    }
}
