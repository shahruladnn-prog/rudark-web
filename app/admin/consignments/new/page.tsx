'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Users, Package, Calendar, Percent, FileText, Check } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { createConsignment } from '@/actions/consignment-actions';
import { useToast } from '@/components/ui/toast';
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
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [partner, setPartner] = useState<ConsignmentPartner>({
        name: '', contact_person: '', phone: '', email: '', address: '', notes: ''
    });
    const [items, setItems] = useState<ConsignmentItemDraft[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [addingProduct, setAddingProduct] = useState('');
    const [addingVariant, setAddingVariant] = useState('');
    const [addingQuantity, setAddingQuantity] = useState(1);
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [commissionRate, setCommissionRate] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    useEffect(() => { loadProducts(); }, []);

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
        const variant = addingVariant ? product.variants?.find(v => v.sku === addingVariant) : null;
        const availableStock = variant ? (variant.stock_quantity ?? 0) : product.stock_quantity;
        const unitPrice = variant?.price ?? product.web_price;
        const variantLabel = variant ? Object.values(variant.options).join(' / ') : undefined;

        const existingIndex = items.findIndex(item =>
            item.product_id === addingProduct && item.variant_sku === (addingVariant || undefined)
        );
        if (existingIndex >= 0) {
            const updated = [...items];
            updated[existingIndex].quantity_sent += addingQuantity;
            setItems(updated);
        } else {
            setItems([...items, {
                product_id: addingProduct, product_name: product.name, sku: product.sku,
                variant_sku: addingVariant || undefined, variant_label: variantLabel,
                unit_price: unitPrice, quantity_sent: addingQuantity, available_stock: availableStock
            }]);
        }
        setAddingProduct('');
        setAddingVariant('');
        setAddingQuantity(1);
    };

    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partner.name.trim()) { showToast('warning', 'Please enter partner name'); return; }
        if (items.length === 0) { showToast('warning', 'Please add at least one item'); return; }
        for (const item of items) {
            if (item.quantity_sent > item.available_stock) {
                showToast('warning', `Not enough stock for ${item.product_name}. Available: ${item.available_stock}`);
                return;
            }
        }
        setSubmitting(true);
        try {
            const result = await createConsignment(
                partner,
                items.map(item => ({
                    product_id: item.product_id, product_name: item.product_name, sku: item.sku,
                    variant_sku: item.variant_sku, variant_label: item.variant_label,
                    unit_price: item.unit_price, quantity_sent: item.quantity_sent
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
                showToast('error', 'Failed to create consignment: ' + result.error);
            }
        } catch (error) {
            showToast('error', 'Error creating consignment: ' + error);
        }
        setSubmitting(false);
    };

    const totalValue = items.reduce((sum, item) => sum + (item.quantity_sent * item.unit_price), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity_sent, 0);
    const inp = "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400";

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/consignments" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">New Consignment</h1>
                    <p className="text-sm text-gray-400">Send inventory to a partner on consignment</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Partner Information */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Users size={16} className="text-blue-500" /> Partner Information
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Partner/Company Name *</label>
                                    <input type="text" value={partner.name}
                                        onChange={(e) => setPartner({ ...partner, name: e.target.value })}
                                        placeholder="e.g., Ace Sports Store" className={inp} required />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Contact Person</label>
                                    <input type="text" value={partner.contact_person}
                                        onChange={(e) => setPartner({ ...partner, contact_person: e.target.value })}
                                        placeholder="Contact name" className={inp} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                                    <input type="text" value={partner.phone}
                                        onChange={(e) => setPartner({ ...partner, phone: e.target.value })}
                                        placeholder="+60 12 345 6789" className={inp} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Email</label>
                                    <input type="email" value={partner.email}
                                        onChange={(e) => setPartner({ ...partner, email: e.target.value })}
                                        placeholder="partner@email.com" className={inp} />
                                </div>
                            </div>
                        </div>

                        {/* Add Items */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Plus size={16} className="text-blue-500" /> Add Items
                            </h2>
                            <input type="text" placeholder="Search products…" value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 md:col-span-1">
                                    <select value={addingProduct}
                                        onChange={(e) => { setAddingProduct(e.target.value); setAddingVariant(''); }}
                                        className={inp}>
                                        <option value="">— Select Product —</option>
                                        {filteredProducts.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (Stock: {product.stock_quantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                    <div className="col-span-2 md:col-span-1">
                                        <select value={addingVariant} onChange={(e) => setAddingVariant(e.target.value)} className={inp}>
                                            <option value="">— Select Variant —</option>
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
                                    <input type="number" min={1} value={addingQuantity}
                                        onChange={(e) => setAddingQuantity(parseInt(e.target.value) || 1)}
                                        placeholder="Qty" className={inp} />
                                </div>
                                <div>
                                    <button type="button" onClick={handleAddItem} disabled={!addingProduct}
                                        className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Package size={16} className="text-gray-400" /> Consignment Items ({items.length})
                            </h2>
                            {items.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-8">No items added yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                            <div>
                                                <div className="text-gray-900 text-sm font-medium">{item.product_name}</div>
                                                {item.variant_label && <div className="text-gray-400 text-xs">{item.variant_label}</div>}
                                                <div className="text-gray-400 text-xs">RM {item.unit_price.toFixed(2)} × {item.quantity_sent}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-gray-900 font-semibold text-sm">{item.quantity_sent} pcs</div>
                                                    <div className="text-blue-600 text-xs font-mono">RM {(item.quantity_sent * item.unit_price).toFixed(2)}</div>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-500">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                        {/* Options */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-gray-400" /> Options
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1.5">
                                        <Calendar size={12} /> Expected Return Date
                                    </label>
                                    <input type="date" value={expectedReturnDate}
                                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1.5">
                                        <Percent size={12} /> Commission Rate (%)
                                    </label>
                                    <input type="number" min={0} max={100} step={0.1} value={commissionRate}
                                        onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="e.g., 20"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any special terms or notes…"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                                        rows={3} />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4">Summary</h2>
                            <div className="space-y-2 text-sm mb-5">
                                <div className="flex justify-between text-gray-500"><span>Partner:</span><span className="text-gray-900">{partner.name || '-'}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Items:</span><span className="text-gray-900">{items.length}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Total Qty:</span><span className="text-gray-900">{totalItems}</span></div>
                                <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-100">
                                    <span>Total Value:</span>
                                    <span className="text-blue-600 font-bold font-mono">RM {totalValue.toFixed(2)}</span>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting || items.length === 0 || !partner.name}
                                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                                {submitting ? 'Creating…' : <><Check size={15} /> Create Consignment</>}
                            </button>
                            <p className="text-gray-400 text-xs text-center mt-2">
                                Stock will not be deducted until you send the consignment
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
