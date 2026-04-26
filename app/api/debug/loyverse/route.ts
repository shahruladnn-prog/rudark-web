import { requireAdmin } from '@/actions/session-actions';
import { NextResponse } from 'next/server';
import { loyverse } from '@/lib/loyverse';

export async function GET() {
    try { await requireAdmin(); } catch (e: any) { return new Response(e.message, { status: 401 }); }

    try {
        const [items, receipts] = await Promise.all([
            loyverse.getItems(1),
            loyverse.getReceipts({ limit: 1 })
        ]);

        return NextResponse.json({
            debug_info: "Inspecting Loyverse API raw structure",
            sample_item: items.items?.[0] || "No items found",
            sample_receipt: receipts.receipts?.[0] || "No receipts found"
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
