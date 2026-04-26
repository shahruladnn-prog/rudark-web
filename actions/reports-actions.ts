'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';

export interface DailyStat {
    date: string;
    orders: number;
    revenue: number;
    completed: number;
    cancelled: number;
}

export interface TopProduct {
    name: string;
    sku: string;
    qty: number;
    revenue: number;
}

export interface ReportsData {
    summary: {
        totalOrders: number;
        totalRevenue: number;
        avgOrderValue: number;
        completedOrders: number;
        cancelledOrders: number;
        completionRate: number;
    };
    daily: DailyStat[];
    topProducts: TopProduct[];
    statusBreakdown: Record<string, number>;
}

export async function getReportsData(dateFrom: string, dateTo: string): Promise<ReportsData> {
    await requireRole(['owner', 'staff']);

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const snapshot = await adminDb
        .collection('orders')
        .where('created_at', '>=', from)
        .where('created_at', '<=', to)
        .orderBy('created_at', 'asc')
        .limit(2000)
        .get();

    const dailyMap = new Map<string, DailyStat>();
    const productMap = new Map<string, TopProduct>();
    const statusCount: Record<string, number> = {};

    let totalRevenue = 0;
    let totalOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    for (const doc of snapshot.docs) {
        const d = doc.data();
        const status = (d.status || 'UNKNOWN').toUpperCase();
        const amount = d.total_amount || 0;
        const createdAt: Date = d.created_at?.toDate?.() ?? new Date(d.created_at ?? 0);
        const dateKey = createdAt.toISOString().slice(0, 10);

        totalOrders++;
        statusCount[status] = (statusCount[status] || 0) + 1;

        const isRevenue = ['PAID', 'SHIPPED', 'READY_TO_SHIP', 'COMPLETED', 'DELIVERED'].includes(status);
        if (isRevenue) totalRevenue += amount;
        if (['COMPLETED', 'DELIVERED'].includes(status)) completedOrders++;
        if (['CANCELLED', 'REFUNDED'].includes(status)) cancelledOrders++;

        // Daily aggregation
        if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { date: dateKey, orders: 0, revenue: 0, completed: 0, cancelled: 0 });
        }
        const day = dailyMap.get(dateKey)!;
        day.orders++;
        if (isRevenue) day.revenue += amount;
        if (['COMPLETED', 'DELIVERED'].includes(status)) day.completed++;
        if (['CANCELLED', 'REFUNDED'].includes(status)) day.cancelled++;

        // Product aggregation
        const items: any[] = d.items || [];
        for (const item of items) {
            const key = item.sku || item.name || 'unknown';
            if (!productMap.has(key)) {
                productMap.set(key, { name: item.name || key, sku: item.sku || '', qty: 0, revenue: 0 });
            }
            const prod = productMap.get(key)!;
            prod.qty += item.quantity || 1;
            if (isRevenue) prod.revenue += (item.price || 0) * (item.quantity || 1);
        }
    }

    const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 15);

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
        summary: {
            totalOrders,
            totalRevenue,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            completedOrders,
            cancelledOrders,
            completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        },
        daily,
        topProducts,
        statusBreakdown: statusCount,
    };
}
