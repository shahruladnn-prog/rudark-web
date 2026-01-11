'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { syncLoyverseToFirebase } from '@/actions/admin-sync';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        if (!confirm('This will fetch latest inventory from Loyverse API. Content will NOT be overwritten. Continue?')) return;

        setSyncing(true);
        try {
            const stats = await syncLoyverseToFirebase();

            if (stats.errors.length === 0) {
                alert(`Sync Complete!\nFetched: ${stats.total_items_fetched}\nCreated: ${stats.created}\nUpdated: ${stats.updated}`);
                router.refresh();
            } else {
                alert(`Sync Completed with Errors:\n${stats.errors.join('\n')}`);
                // Still refresh to show partial success
                router.refresh();
            }
        } catch (err) {
            alert('Critical Sync Failure');
            console.error(err);
        }
        setSyncing(false);
    };

    return (
        <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-rudark-carbon text-gray-300 px-6 py-2 rounded-sm border border-rudark-grey hover:border-rudark-volt hover:text-rudark-volt transition-colors font-condensed uppercase font-bold tracking-wide disabled:opacity-50"
        >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Loyverse'}
        </button>
    );
}
