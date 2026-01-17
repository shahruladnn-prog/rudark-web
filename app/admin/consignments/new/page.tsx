'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Users, Package, Calendar, Percent, FileText, Check } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { createConsignment } from '@/actions/consignment-actions';
import { ConsignmentPartner } from '@/types/consignment';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
    web_price: number;
    stock_quantity: number;
    variants?: Array<{
        sku: string;
        options: Record<string, string>;
        stock_quantity?: number;
        price?: number;
    }>;
}

interface ConsignmentItemDraft {
    product_id: string;
    product_name: string;
    sku: string;
    variant_sku?: string;
    variant_label?: string;
    unit_price: number;
    quantity_sent: number;
    available_stock: number;
}

export default function NewConsignmentPage() {
    const router = useRouter();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Partner form
    const [partner, setPartner] = useState<ConsignmentPartner>({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    // Items
    const [items, setItems] = useState<ConsignmentItemDraft[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Add item form
    const [addingProduct, setAddingProduct] = useState('');
    const [addingVariant, setAddingVariant] = useState('');
    const [addingQuantity, setAddingQuantity] = useState(1);

    // Options
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [commissionRate, setCommissionRate] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data.map((p: any) => ({
                id: p.id,
                name: p.name || 'Unnamed',
                sku: p.sku || '',
                web_price: p.web_price || p.price || 0,
                stock_quantity: p.stock_quantity ?? 0,
                variants: p.variants || []
            })));
        } catch (error) {
            console.error('Failed to load products:', error);
        }
        setLoading(false);
    };

    const selectedProduct = products.find(p => p.id === addingProduct);
    const selectedVariant = selectedProduct?.variants?.find(v => v.sku === addingVariant);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddItem = () => {
        if (!addingProduct || addingQuantity < 1) return;

        const product = products.find(p => p.id === addingProduct);
        if (!product) return;

        const variant = addingVariant
            ? product.variants?.find(v => v.sku === addingVariant)
            : null;

        const availableStock = variant
            ? (variant.stock_quantity ?? 0)
            : product.stock_quantity;

        const unitPrice = variant?.price ?? product.web_price;

        const variantLabel = variant
            ? Object.values(variant.options).join(' / ')
            : undefined;

        // Check if already added
        const existingIndex = items.findIndex(item =>
            item.product_id === addingProduct &&
            item.variant_sku === (addingVariant || undefined)
        );

        if (existingIndex >= 0) {
            // Update existing
            const updated = [...items];
            updated[existingIndex].quantity_sent += addingQuantity;
            setItems(updated);
        } else {
            // Add new
            setItems([...items, {
                product_id: addingProduct,
                product_name: product.name,
                sku: product.sku,
                variant_sku: addingVariant || undefined,
                variant_label: variantLabel,
                unit_price: unitPrice,
                quantity_sent: addingQuantity,
                available_stock: availableStock
            }]);
        }

        // Reset add form
        setAddingProduct('');
        setAddingVariant('');
        setAddingQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!partner.name.trim()) {
            alert('Please enter partner name');
            return;
        }

        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validate stock
        for (const item of items) {
            if (item.quantity_sent > item.available_stock) {
                alert(`Not enough stock for ${item.product_name}. Available: ${item.available_stock}`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await createConsignment(
                partner,
                items.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    sku: item.sku,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    unit_price: item.unit_price,
                    quantity_sent: item.quantity_sent
                })),
                {
                    expected_return_date: expectedReturnDate || undefined,
                    commission_rate: commissionRate ? Number(commissionRate) : undefined,
                    notes: notes || undefined
                }
            );

            if (result.success) {
                router.push(`/admin/consignments/${result.consignment_id}`);
            } else {
                alert('Failed to create consignment: ' + result.error);
            }
        } catch (error) {
            alert('Error creating consignment: ' + error);
        }
        setSubmitting(false);
    };

    const totalValue = items.reduce((sum, item) => sum + (item.quantity_sent * item.unit_price), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity_sent, 0);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/consignments" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                    <ArrowLeft size={16} />
                    Back to Consignments
                </Link>
                <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                    New <span className="text-purple-400">Consignment</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Send inventory to a partner on consignment
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Partner & Items */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Partner Information */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <Users size={20} className="text-purple-400" />
                                Partner Information
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-gray-400 text-sm mb-2">Partner/Company Name *</label>
                                    <input
                                        type="text"
                                        value={partner.name}
                                        onChange={(e) => setPartner({ ...partner, name: e.target.value })}
                                        placeholder="e.g., Ace Sports Store"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                        required
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-gray-400 text-sm mb-2">Contact Person</label>
                                    <input
                                        type="text"
                                        value={partner.contact_person}
                                        onChange={(e) => setPartner({ ...partner, contact_person: e.target.value })}
                                        placeholder="Contact name"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Phone</label>
                                    <input
                                        type="text"
                                        value={partner.phone}
                                        onChange={(e) => setPartner({ ...partner, phone: e.target.value })}
                                        placeholder="+60 12 345 6789"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={partner.email}
                                        onChange={(e) => setPartner({ ...partner, email: e.target.value })}
                                        placeholder="partner@email.com"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Add Items */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-purple-400" />
                                Add Items
                            </h2>

                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm mb-4"
                            />

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="col-span-2 md:col-span-1">
                                    <select
                                        value={addingProduct}
                                        onChange={(e) => {
                                            setAddingProduct(e.target.value);
                                            setAddingVariant('');
                                        }}
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    >
                                        <option value="">-- Select Product --</option>
                                        {filteredProducts.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (Stock: {product.stock_quantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                    <div className="col-span-2 md:col-span-1">
                                        <select
                                            value={addingVariant}
                                            onChange={(e) => setAddingVariant(e.target.value)}
                                            className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                        >
                                            <option value="">-- Select Variant --</option>
                                            {selectedProduct.variants.map(variant => {
                                                const label = Object.values(variant.options || {}).join(' / ');
                                                return (
                                                    <option key={variant.sku} value={variant.sku}>
                                                        {label || variant.sku} (Stock: {variant.stock_quantity ?? 0})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={addingQuantity}
                                        onChange={(e) => setAddingQuantity(parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!addingProduct}
                                        className="w-full px-4 py-3 bg-purple-600 text-white font-bold uppercase rounded-sm hover:bg-purple-500 disabled:opacity-50"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <Package size={20} />
                                Consignment Items ({items.length})
                            </h2>

                            {items.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No items added yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-rudark-matte rounded-sm">
                                            <div>
                                                <div className="text-white font-medium">{item.product_name}</div>
                                                {item.variant_label && (
                                                    <div className="text-gray-400 text-xs">{item.variant_label}</div>
                                                )}
                                                <div className="text-gray-500 text-xs">
                                                    RM {item.unit_price.toFixed(2)} × {item.quantity_sent}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-white font-bold">{item.quantity_sent} pcs</div>
                                                    <div className="text-purple-400 text-sm font-mono">
                                                        RM {(item.quantity_sent * item.unit_price).toFixed(2)}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Summary & Options */}
                    <div className="space-y-6">
                        {/* Options */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <FileText size={20} />
                                Options
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                                        <Calendar size={14} />
                                        Expected Return Date
                                    </label>
                                    <input
                                        type="date"
                                        value={expectedReturnDate}
                                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                                        <Percent size={14} />
                                        Commission Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="e.g., 20"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any special terms or notes..."
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-rudark-carbon p-6 border border-purple-500/30 rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4">Summary</h2>

                            <div className="space-y-3">
                                <div className="flex justify-between text-gray-400">
                                    <span>Partner:</span>
                                    <span className="text-white">{partner.name || '-'}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Items:</span>
                                    <span className="text-white">{items.length}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Total Qty:</span>
                                    <span className="text-white">{totalItems}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 pt-3 border-t border-rudark-grey">
                                    <span>Total Value:</span>
                                    <span className="text-purple-400 font-bold text-xl font-mono">
                                        RM {totalValue.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || items.length === 0 || !partner.name}
                                className="w-full mt-6 px-6 py-3 bg-purple-600 text-white font-bold uppercase rounded-sm hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Creating...' : (
                                    <>
                                        <Check size={18} />
                                        Create Consignment
                                    </>
                                )}
                            </button>

                            <p className="text-gray-500 text-xs text-center mt-3">
                                Stock will not be deducted until you send the consignment
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
