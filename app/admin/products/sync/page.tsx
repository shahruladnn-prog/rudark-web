'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    RefreshCw, ChevronLeft, Package, 
    CheckCircle, AlertCircle, Image as ImageIcon,
    Loader2, Hash, Database
} from 'lucide-react';
import { importLoyverseProducts } from '@/actions/admin-sync';
import { useToast } from '@/components/ui/toast';

export default function ProductSyncPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        created: number;
        updated: number;
        errors: string[];
    } | null>(null);

    const handleSync = async () => {
        if (!confirm('This will import product names, SKUs, and prices from Loyverse. Stock quantities will be set to 0 — use Bulk Stock Entry to enter your actual counts. Continue?')) return;

        setLoading(true);
        setResult(null);
        try {
            const stats = await importLoyverseProducts();
            setResult(stats);
            if (stats.errors.length > 0) {
                showToast('warning', `Sync completed with ${stats.errors.length} errors`);
            } else {
                showToast('success', `Successfully synced catalog`);
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
                    <h1 className="text-2xl font-bold text-gray-900">Import Catalog from Loyverse</h1>
                    <p className="text-gray-500 text-sm">One-time import of product names, SKUs, and prices. Stock is set to 0 — enter counts via Bulk Stock Entry.</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-8">
                <div className="p-8 text-center max-w-lg mx-auto">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Database size={32} />
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Sync Master Catalog</h3>
                    <p className="text-sm text-gray-500 mb-8">
                        Pull the latest product names, SKUs, prices, and variant structures from your Loyverse store. 
                        Existing products in Firebase will be updated based on their SKU.
                    </p>

                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Syncing Catalog...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={20} />
                                Start Full Catalog Sync
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-gray-50 border-t border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureItem icon={Hash} title="SKU Matching" desc="Syncs existing items by SKU" />
                    <FeatureItem icon={ImageIcon} title="Images" desc="Pulls Loyverse product photos" />
                    <FeatureItem icon={Package} title="Variants" desc="Imports sizes, colors, etc." />
                </div>
            </div>

            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-lg text-center">
                            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">New Products Created</div>
                            <div className="text-4xl font-black text-emerald-900">{result.created}</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg text-center">
                            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Existing Products Updated</div>
                            <div className="text-4xl font-black text-blue-900">{result.updated}</div>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg overflow-hidden">
                            <div className="px-6 py-4 bg-red-100/50 border-b border-red-100 flex items-center gap-2 text-red-700">
                                <AlertCircle size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">Sync Warnings ({result.errors.length})</span>
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

                    <div className="flex justify-center">
                        <button 
                            onClick={() => router.push('/admin/products')}
                            className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline"
                        >
                            View Product List →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400">
                <Icon size={14} />
            </div>
            <div>
                <div className="text-xs font-bold text-gray-900 uppercase">{title}</div>
                <div className="text-[10px] text-gray-500">{desc}</div>
            </div>
        </div>
    );
}
