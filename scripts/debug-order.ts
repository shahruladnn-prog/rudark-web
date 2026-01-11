import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { adminDb } from '../lib/firebase-admin';

async function main() {
    const orderId = 'ORD-1767998388375';
    console.log(`Fetching Order: ${orderId}...`);

    try {
        const doc = await adminDb.collection('orders').doc(orderId).get();
        if (!doc.exists) {
            console.log('Order not found!');
            return;
        }

        const data = doc.data();
        console.log('ParcelAsia Error:', JSON.stringify(data?.parcel_asia_error));
        console.log('Loyverse Status:', data?.loyverse_sync);
        console.log('Loyverse Error:', JSON.stringify(data?.loyverse_error));
    } catch (error) {
        console.error('Error fetching order:', error);
    }
}

main();
