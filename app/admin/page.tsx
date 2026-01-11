'use client';

import { useState } from 'react';
import { syncLoyverseToFirebase } from '@/actions/admin-sync';

import { seedCategories } from '@/actions/seed-categories';

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // Reverted to object for UI access

    const handleSync = async () => {
        setLoading(true);
        setResult(null);
        try {
            const stats = await syncLoyverseToFirebase();
            setResult(stats);
        } catch (error) {
            setResult({ errors: ['Failed to sync'] }); // Match UI expectation
        } finally {
            setLoading(false);
        }
    };


    const handleSeedCategories = async () => {
        setLoading(true);
        setResult("Syncing structure...");
        const res = await seedCategories();
        setResult(res.success ? "Success: Categories Structure Synced" : "Error: " + res.error);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-rudark-matte p-8 font-sans">
            <div className="max-w-2xl mx-auto bg-rudark-carbon border border-rudark-grey rounded-sm shadow-xl p-8">
                <h1 className="text-4xl font-condensed font-bold mb-6 text-white uppercase tracking-wide border-b border-rudark-grey pb-4">
                    Admin <span className="text-rudark-volt">Command</span> Center
                </h1>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-condensed font-bold mb-4 text-gray-200 uppercase">Quick Access</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Products */}
                            <a
                                href="/admin/products"
                                className="bg-rudark-charcoal border border-rudark-grey p-6 rounded hover:border-rudark-volt transition-colors group"
                            >
                                <h3 className="text-lg font-condensed font-bold text-white group-hover:text-rudark-volt mb-2">
                                    📦 Products
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Manage inventory, variants, and pricing
                                </p>
                            </a>

                            {/* Categories */}
                            <a
                                href="/admin/categories"
                                className="bg-rudark-charcoal border border-rudark-grey p-6 rounded hover:border-rudark-volt transition-colors group"
                            >
                                <h3 className="text-lg font-condensed font-bold text-white group-hover:text-rudark-volt mb-2">
                                    📁 Categories
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Organize product categories
                                </p>
                            </a>

                            {/* Shipping Settings */}
                            <a
                                href="/admin/shipping-settings"
                                className="bg-rudark-charcoal border border-rudark-volt p-6 rounded hover:bg-rudark-volt hover:text-black transition-all group"
                            >
                                <h3 className="text-lg font-condensed font-bold text-rudark-volt group-hover:text-black mb-2">
                                    🚚 Shipping Settings
                                </h3>
                                <p className="text-sm text-gray-400 group-hover:text-black">
                                    Configure free shipping threshold
                                </p>
                            </a>

                            {/* Collection Settings */}
                            <a
                                href="/admin/collection-settings"
                                className="bg-rudark-charcoal border border-rudark-grey p-6 rounded hover:border-rudark-volt transition-colors group"
                            >
                                <h3 className="text-lg font-condensed font-bold text-white group-hover:text-rudark-volt mb-2">
                                    📍 Collection Points
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Manage self-collection locations
                                </p>
                            </a>

                            {/* Collection Monitor */}
                            <a
                                href="/admin/collections"
                                className="bg-rudark-charcoal border border-rudark-grey p-6 rounded hover:border-rudark-volt transition-colors group"
                            >
                                <h3 className="text-lg font-condensed font-bold text-white group-hover:text-rudark-volt mb-2">
                                    📦 Collection Monitor
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Track self-collection orders
                                </p>
                            </a>

                            {/* Loyverse Sync */}
                            <button
                                onClick={handleSync}
                                disabled={loading}
                                className="bg-rudark-charcoal border border-rudark-grey p-6 rounded hover:border-rudark-volt transition-colors group text-left disabled:opacity-50"
                            >
                                <h3 className="text-lg font-condensed font-bold text-white group-hover:text-rudark-volt mb-2">
                                    🔄 Sync Loyverse
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {loading ? 'Syncing...' : 'Sync inventory from Loyverse'}
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Sync Results */}
                    {result && (
                        <div className="bg-rudark-charcoal border border-rudark-volt p-4 rounded">
                            <h3 className="text-sm font-condensed font-bold text-rudark-volt mb-2">Sync Results</h3>
                            <pre className="text-xs text-gray-300 font-mono overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
