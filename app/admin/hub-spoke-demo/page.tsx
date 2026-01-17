'use client';

import { useState } from 'react';

// MOCK DATA - This is NOT real Firebase data!
const MOCK_PRODUCTS = [
    {
        id: 'PRD001',
        name: 'Black T-Shirt',
        sku: 'TSHIRT-BLK-M',
        inventory_by_location: {
            main_warehouse: { available: 30, reserved: 2, committed: 5 },
            store_kl: { available: 8, reserved: 0, committed: 0 },
            store_penang: { available: 12, reserved: 0, committed: 0 },
            event_booth_jan: { available: 5, reserved: 0, committed: 0 },
            consignment_partner_a: { available: 5, reserved: 0, committed: 0 }
        }
    },
    {
        id: 'PRD002',
        name: 'Blue Jeans',
        sku: 'JEANS-BLU-32',
        inventory_by_location: {
            main_warehouse: { available: 45, reserved: 3, committed: 10 },
            store_kl: { available: 15, reserved: 0, committed: 0 },
            store_penang: { available: 8, reserved: 0, committed: 0 },
            event_booth_jan: { available: 0, reserved: 0, committed: 0 },
            consignment_partner_a: { available: 3, reserved: 0, committed: 0 }
        }
    },
    {
        id: 'PRD003',
        name: 'Red Hoodie',
        sku: 'HOODIE-RED-L',
        inventory_by_location: {
            main_warehouse: { available: 22, reserved: 1, committed: 0 },
            store_kl: { available: 5, reserved: 0, committed: 0 },
            store_penang: { available: 3, reserved: 0, committed: 0 },
            event_booth_jan: { available: 2, reserved: 0, committed: 0 },
            consignment_partner_a: { available: 0, reserved: 0, committed: 0 }
        }
    }
];

const MOCK_TRANSFER_REQUESTS = [
    {
        id: 'TRF-001',
        product_name: 'Black T-Shirt',
        sku: 'TSHIRT-BLK-M',
        from_location: 'main_warehouse',
        to_location: 'store_kl',
        quantity: 5,
        status: 'PENDING',
        requested_by: 'Store Manager KL',
        created_at: '2026-01-12T10:30:00Z'
    },
    {
        id: 'TRF-002',
        product_name: 'Blue Jeans',
        sku: 'JEANS-BLU-32',
        from_location: 'main_warehouse',
        to_location: 'store_penang',
        quantity: 10,
        status: 'APPROVED',
        requested_by: 'Store Manager Penang',
        created_at: '2026-01-11T14:20:00Z'
    },
    {
        id: 'TRF-003',
        product_name: 'Red Hoodie',
        sku: 'HOODIE-RED-L',
        from_location: 'main_warehouse',
        to_location: 'event_booth_jan',
        quantity: 2,
        status: 'DELIVERED',
        requested_by: 'Event Coordinator',
        created_at: '2026-01-10T09:00:00Z'
    }
];

const LOCATION_LABELS: Record<string, string> = {
    main_warehouse: '🏢 Main Warehouse (Hub)',
    store_kl: '🏪 Store KL',
    store_penang: '🏪 Store Penang',
    event_booth_jan: '🎪 Event Booth (Jan 2026)',
    consignment_partner_a: '🤝 Consignment Partner A'
};

export default function HubSpokeDemoPage() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'transfers'>('inventory');
    const [selectedProduct, setSelectedProduct] = useState(MOCK_PRODUCTS[0]);

    const calculateTotals = (product: typeof MOCK_PRODUCTS[0]) => {
        let totalAvailable = 0;
        let totalReserved = 0;
        let totalCommitted = 0;

        Object.values(product.inventory_by_location).forEach(loc => {
            totalAvailable += loc.available;
            totalReserved += loc.reserved;
            totalCommitted += loc.committed;
        });

        return { totalAvailable, totalReserved, totalCommitted };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            {/* Demo Warning Banner */}
            <div className="mb-6 bg-yellow-500/10 border-2 border-yellow-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div>
                        <h3 className="text-yellow-400 font-bold text-lg">DEMO MODE - Sample Data Only</h3>
                        <p className="text-yellow-200 text-sm">
                            This is a visualization mockup. No real Firebase data is being used or modified.
                        </p>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Hub & Spoke Inventory System</h1>
                <p className="text-slate-400">Multi-Location Stock Management Dashboard</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'inventory'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    📦 Inventory Overview
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'transfers'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    🚚 Transfer Requests
                </button>
            </div>

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    {/* Product Selector */}
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                        <label className="block text-slate-300 mb-3 font-semibold">Select Product:</label>
                        <select
                            value={selectedProduct.id}
                            onChange={(e) => setSelectedProduct(MOCK_PRODUCTS.find(p => p.id === e.target.value)!)}
                            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none"
                        >
                            {MOCK_PRODUCTS.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Stock Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                            const totals = calculateTotals(selectedProduct);
                            return (
                                <>
                                    <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/50 rounded-lg p-6">
                                        <div className="text-green-400 text-sm font-semibold mb-2">Total Available</div>
                                        <div className="text-white text-4xl font-bold">{totals.totalAvailable}</div>
                                        <div className="text-green-300 text-xs mt-2">Across all locations</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/50 rounded-lg p-6">
                                        <div className="text-yellow-400 text-sm font-semibold mb-2">Reserved (Carts)</div>
                                        <div className="text-white text-4xl font-bold">{totals.totalReserved}</div>
                                        <div className="text-yellow-300 text-xs mt-2">Customers checking out</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/50 rounded-lg p-6">
                                        <div className="text-blue-400 text-sm font-semibold mb-2">Committed (Transit)</div>
                                        <div className="text-white text-4xl font-bold">{totals.totalCommitted}</div>
                                        <div className="text-blue-300 text-xs mt-2">Approved for transfer</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Location Breakdown Table */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 border-b border-slate-600">
                            <h3 className="text-xl font-bold text-white">Stock by Location</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Location</th>
                                        <th className="px-6 py-3 text-right text-slate-300 font-semibold">Available</th>
                                        <th className="px-6 py-3 text-right text-slate-300 font-semibold">Reserved</th>
                                        <th className="px-6 py-3 text-right text-slate-300 font-semibold">Committed</th>
                                        <th className="px-6 py-3 text-right text-slate-300 font-semibold">Sellable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {Object.entries(selectedProduct.inventory_by_location).map(([locationKey, stock]) => {
                                        const sellable = stock.available - stock.reserved - stock.committed;
                                        return (
                                            <tr key={locationKey} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 text-white font-medium">
                                                    {LOCATION_LABELS[locationKey] || locationKey}
                                                </td>
                                                <td className="px-6 py-4 text-right text-green-400 font-bold">{stock.available}</td>
                                                <td className="px-6 py-4 text-right text-yellow-400">{stock.reserved}</td>
                                                <td className="px-6 py-4 text-right text-blue-400">{stock.committed}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full font-bold ${sellable > 10 ? 'bg-green-500/20 text-green-400' :
                                                            sellable > 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {sellable}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSFERS TAB */}
            {activeTab === 'transfers' && (
                <div className="space-y-6">
                    {/* Transfer Requests Table */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 border-b border-slate-600">
                            <h3 className="text-xl font-bold text-white">Transfer Requests</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Request ID</th>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Product</th>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">From → To</th>
                                        <th className="px-6 py-3 text-right text-slate-300 font-semibold">Quantity</th>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Status</th>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Requested By</th>
                                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {MOCK_TRANSFER_REQUESTS.map(request => (
                                        <tr key={request.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-mono text-sm">{request.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-white font-semibold">{request.product_name}</div>
                                                <div className="text-slate-400 text-sm">{request.sku}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <span>{LOCATION_LABELS[request.from_location]?.split(' ')[0]}</span>
                                                    <span>→</span>
                                                    <span>{LOCATION_LABELS[request.to_location]?.split(' ')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-white font-bold">{request.quantity}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${request.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                        request.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                                                            'bg-green-500/20 text-green-400 border border-green-500/50'
                                                    }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 text-sm">{request.requested_by}</td>
                                            <td className="px-6 py-4">
                                                {request.status === 'PENDING' && (
                                                    <div className="flex gap-2">
                                                        <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold transition-colors">
                                                            ✓ Approve
                                                        </button>
                                                        <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-semibold transition-colors">
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {request.status === 'APPROVED' && (
                                                    <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-colors">
                                                        📦 Confirm Delivery
                                                    </button>
                                                )}
                                                {request.status === 'DELIVERED' && (
                                                    <span className="text-green-400 text-sm">✓ Complete</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* New Transfer Request Button */}
                    <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-blue-500/50 transition-all">
                        + Create New Transfer Request
                    </button>
                </div>
            )}
        </div>
    );
}
