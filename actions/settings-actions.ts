'use server';

import { adminDb } from '@/lib/firebase-admin';
import { unstable_cache } from 'next/cache';
import { StoreSettings } from '@/types';

export const getSettings = unstable_cache(
    async (): Promise<StoreSettings> => {
        try {
            const doc = await adminDb.collection('settings').doc('general').get();
            if (doc.exists) {
                return doc.data() as StoreSettings;
            }
            return {
                storeName: "Rud'Ark Pro Shop",
                supportEmail: "support@rudark.com",
                announcementText: "Welcome to the official Rud'Ark store.",
                announcementEnabled: true,
                businessAddress: "",
                taxRate: 0
            };
        } catch (error) {
            console.error("Error fetching settings:", error);
            return {
                storeName: "Rud'Ark Pro Shop",
                supportEmail: "support@rudark.com",
                announcementText: "Welcome to the official Rud'Ark store.",
                announcementEnabled: true,
                businessAddress: "",
                taxRate: 0
            };
        }
    },
    ['settings-general'],
    { tags: ['settings'] }
);

import { revalidatePath, revalidateTag } from 'next/cache';
// ...
export async function saveSettings(data: StoreSettings) {
    try {
        await adminDb.collection('settings').doc('general').set(data, { merge: true });
        revalidateTag('settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Error saving settings:", error);
        return { success: false, error: 'Failed to save settings' };
    }
}
