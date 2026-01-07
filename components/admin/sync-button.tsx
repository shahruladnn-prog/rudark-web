'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { syncInventory } from '@/actions/sync';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
    const [syncing, setSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        if (!confirm('This will fetch latest inventory from Loyverse. Content will NOT be overwritten. Continue?')) return;

        setSyncing(true);
        const res = await syncInventory();

        if (res.success) {
            alert(`Sync Complete!\nCreated: ${res.stats?.created}\nUpdated: ${res.stats?.updated}`);
            router.refresh();
        } else {
            alert('Sync Failed');
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
