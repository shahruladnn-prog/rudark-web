'use client';

import { useState } from 'react';
import { syncStockFromLoyverse, initializeStockFields } from '@/actions/sync-stock';

export default function StockSyncPage() {
    const [syncing, setSyncing] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSync = async () => {
        setSyncing(true);
        setResult(null);
        const res = await syncStockFromLoyverse();
        setResult(res);
        setSyncing(false);
    };

    const handleInitialize = async () => {
        setInitializing(true);
        setResult(null);
        const res = await initializeStockFields();
        setResult(res);
        setInitializing(false);
    };

    return (
        <div className="p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Stock Management</h1>
            <p className="text-gray-600 mb-8">Sync stock from Loyverse to Firebase</p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>

                <div className="space-y-4">
                    {/* Initialize */}
                    <div>
                        <button
                            onClick={handleInitialize}
                            disabled={initializing || syncing}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {initializing ? 'Initializing...' : '1. Initialize Stock Fields'}
                        </button>
                        <p className="text-sm text-gray-700 mt-2 font-medium">
                            Run this ONCE to add stock fields to existing products
                        </p>
                    </div>

                    {/* Sync */}
                    <div>
                        <button
                            onClick={handleSync}
                            disabled={syncing || initializing}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {syncing ? 'Syncing...' : '2. Sync from Loyverse'}
                        </button>
                        <p className="text-sm text-gray-700 mt-2 font-medium">
                            Fetch latest stock from Loyverse and update Firebase
                        </p>
                    </div>
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className={`border rounded-lg p-6 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                    <h3 className="font-semibold mb-2 text-gray-900">
                        {result.success ? '✅ Success' : '❌ Error'}
                    </h3>
                    <pre className="text-sm overflow-auto text-gray-900 font-mono">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}

            {/* Info */}
            <div className="mt-8 bg-blue-50 border border-blue-300 rounded-lg p-6">
                <h3 className="font-semibold mb-2 text-gray-900">ℹ️ How It Works</h3>
                <ul className="text-sm space-y-2 text-gray-800">
                    <li className="font-medium">• <strong>Initialize:</strong> Adds stock_quantity and reserved_quantity fields to all products</li>
                    <li className="font-medium">• <strong>Sync:</strong> Fetches inventory from Loyverse and updates Firebase</li>
                    <li className="font-medium">• <strong>Automatic:</strong> Set up a Cloud Function to run sync hourly</li>
                    <li className="font-medium">• <strong>Reserved Stock:</strong> Automatically managed during checkout</li>
                </ul>
            </div>
        </div>
    );
}
