'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    RefreshCw, ChevronLeft, Calendar, 
    CheckCircle, AlertCircle, ShoppingBag, 
    Layers, Loader2, ArrowRight
} from 'lucide-react';
import { syncLoyverseReceipts } from '@/actions/admin-sync';
import { useToast } from '@/components/ui/toast';

export default function BatchSyncPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState(1); // Default 1 day
    const [result, setResult] = useState<{
        receipts_processed: number;
        items_deducted: number;
        errors: string[];
    } | null>(null);

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        try {
            const stats = await syncLoyverseReceipts(period);
            setResult(stats);
            if (stats.errors.length > 0) {
                showToast('warning', `Sync completed with ${stats.errors.length} errors`);
            } else {
                showToast('success', `Successfully synced ${stats.receipts_processed} receipts`);
            }
        } catch (error: any) {
            showToast('error', error.message || 'Sync failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">POS Sales Synchronization</h1>
                    <p className="text-gray-500 text-sm">Sync historical receipts from Loyverse to Firebase</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <SyncPeriodCard 
                    days={1} 
                    label="Last 24 Hours" 
                    selected={period === 1} 
                    onClick={() => setPeriod(1)} 
                />
                <SyncPeriodCard 
                    days={7} 
                    label="Past 7 Days" 
                    selected={period === 7} 
                    onClick={() => setPeriod(7)} 
                />
                <SyncPeriodCard 
                    days={30} 
                    label="Past 30 Days" 
                    selected={period === 30} 
                    onClick={() => setPeriod(30)} 
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
                <div className="max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <RefreshCw size={32} className={loading ? 'animate-spin' : ''} />
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Synchronize?</h3>
                    <p className="text-sm text-gray-500 mb-8">
                        This will pull all receipts from Loyverse for the selected period. 
                        Double entries are automatically prevented using idempotency keys.
                    </p>

                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Processing Sync...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={20} />
                                Start Synchronization
                            </>
                        )}
                    </button>
                </div>
            </div>

            {result && (
                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border border-green-100 p-6 rounded-lg">
                            <div className="flex items-center gap-3 text-green-700 mb-1">
                                <CheckCircle size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">Receipts Processed</span>
                            </div>
                            <div className="text-3xl font-black text-green-900">{result.receipts_processed}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg">
                            <div className="flex items-center gap-3 text-blue-700 mb-1">
                                <Layers size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">Items Deducted</span>
                            </div>
                            <div className="text-3xl font-black text-blue-900">{result.items_deducted}</div>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg overflow-hidden">
                            <div className="px-6 py-4 bg-red-100/50 border-b border-red-100 flex items-center gap-2 text-red-700">
                                <AlertCircle size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">Sync Errors ({result.errors.length})</span>
                            </div>
                            <div className="p-4 max-h-60 overflow-y-auto">
                                <ul className="space-y-2">
                                    {result.errors.map((err, i) => (
                                        <li key={i} className="text-xs text-red-600 font-mono bg-white p-2 border border-red-50 rounded">
                                            {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SyncPeriodCard({ days, label, selected, onClick }: { days: number, label: string, selected: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`p-6 border rounded-lg text-left transition-all ${
                selected 
                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
        >
            <Calendar size={24} className={selected ? 'text-blue-600' : 'text-gray-400'} />
            <div className={`mt-4 font-bold ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{label}</div>
            <div className="text-xs text-gray-500 mt-1">Deduct stock for sales since {days} day(s) ago</div>
        </button>
    );
}
