'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { syncLoyverseItems } from '@/actions/admin-sync';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export default function SyncButton() {
    const [syncing, setSyncing] = useState(false);
    const [lastResult, setLastResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
    const router = useRouter();
    const { showToast } = useToast();

    const handleSync = async () => {
        if (!confirm('Fetch latest products and variants from Loyverse?')) return;

        setSyncing(true);
        setLastResult(null);
        try {
            const stats = await syncLoyverseItems();
            setLastResult(stats);

            if (stats.errors.length === 0) {
                showToast('success', `Sync complete — ${stats.created} created, ${stats.updated} updated`);
            } else {
                showToast('warning', `Sync finished with ${stats.errors.length} error(s)`);
            }
            router.refresh();
        } catch (err) {
            showToast('error', 'Sync failed — check console for details');
            console.error(err);
        }
        setSyncing(false);
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 rounded text-sm transition-colors disabled:opacity-50"
            >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync Loyverse'}
            </button>

            {lastResult && (
                <div className={`flex items-start gap-2 text-xs rounded px-3 py-2 ${lastResult.errors.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {lastResult.errors.length === 0
                        ? <CheckCircle size={13} className="mt-0.5 shrink-0" />
                        : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
                    <span>
                        {lastResult.created} created · {lastResult.updated} updated
                        {lastResult.errors.length > 0 && ` · ${lastResult.errors.length} errors`}
                    </span>
                </div>
            )}
        </div>
    );
}
