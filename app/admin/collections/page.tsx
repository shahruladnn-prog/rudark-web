import { getCollectionOrders, markAsCollected, getCollectionStats } from '@/actions/collection-orders-actions';
import CollectionOrdersClient from './collection-orders-client';

export const dynamic = 'force-dynamic';

export default async function CollectionOrdersPage() {
    const orders = await getCollectionOrders();
    const stats = await getCollectionStats();

    return <CollectionOrdersClient initialOrders={orders} initialStats={stats} />;
}
