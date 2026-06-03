'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';

export default function BatchSyncPage() {
    const router = useRouter();

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Loyverse Sync — Removed</h1>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                <div className="flex gap-4">
                    <Info size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h2 className="font-bold text-blue-900 mb-2">Loyverse sync has been removed</h2>
                        <p className="text-blue-800 text-sm mb-4">
                            Firebase is now the single source of truth for all inventory.
                            Loyverse is used as a cash register only — its inventory numbers are ignored.
                        </p>
                        <p className="text-blue-800 text-sm mb-6">
                            To record physical store sales, use <strong>Record External Sale</strong> and select <strong>Physical Store</strong> as the channel.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => router.push('/admin/stock/record-sale')}
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-blue-700 transition-colors w-fit"
                            >
                                Go to Record External Sale
                            </button>
                            <button
                                onClick={() => router.push('/admin/stock')}
                                className="inline-flex items-center gap-2 text-blue-700 text-sm hover:underline w-fit"
                            >
                                Back to Stock Management
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
