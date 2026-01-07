'use client';

import { useState } from 'react';
import { syncLoyverseToFirebase } from '@/actions/admin-sync';
import { seedSampleData } from '@/actions/seed'; // Fixed export name
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

    const handleSeed = async () => {
        setLoading(true);
        setResult(null); // Clear previous results
        try {
            // seedSampleData returns { success: true, count: 5 }
            const res = await seedSampleData();
            alert(`Success: ${res.count} products generated.`);
        } catch (err) {
            alert("Error seeding products");
        }
        setLoading(false);
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

                <div className="space-y-8">
                    <div>
                        <h2 className="text-xl font-condensed font-bold mb-2 text-gray-200 uppercase">Inventory Sync</h2>
                        <p className="text-gray-400 mb-6 text-sm">
                            Pull products and inventory levels from Loyverse to Firebase Master Node.
                        </p>

                        <button
                            onClick={handleSync}
                            disabled={loading}
                            className="bg-rudark-volt text-black hover:bg-white font-condensed font-bold text-lg py-3 px-8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-wider w-full justify-center"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                                    Syncing...
                                </>
                            ) : (
                                'Initiate Sync Sequence'
                            )}
                        </button>
                    </div>

                    {result && (
                        <div className={`p-4 border ${result.errors?.length ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-green-900/20 border-green-800 text-green-200'} font-mono text-sm`}>
                            <h3 className="font-bold mb-2 uppercase">Sync Status Report:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Items Fetched: {result.total_items_fetched}</li>
                                <li>New Records: {result.created}</li>
                                <li>Updated Records: {result.updated}</li>
                                {result.errors?.length > 0 && (
                                    <li className="font-bold text-red-500">Errors: {result.errors.length}</li>
                                )}
                            </ul>
                        </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-rudark-grey">
                        <h2 className="text-xl font-condensed font-bold mb-2 text-gray-200 uppercase">Development Tools</h2>
                        <p className="text-gray-400 mb-6 text-sm">
                            Generate sample Rud'Ark products for visual testing.
                        </p>
                        <button
                            onClick={async () => {
                                setLoading(true);
                                await seedSampleData();
                                setLoading(false);
                                alert('Sample data created!');
                            }}
                            disabled={loading}
                            className="w-full bg-rudark-grey text-white hover:bg-white hover:text-black font-condensed font-bold text-lg py-3 px-8 transition-colors disabled:opacity-50 uppercase tracking-wider"
                        >
                            Generate Sample Products
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
