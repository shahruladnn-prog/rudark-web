'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, ShoppingCart, Plus, Minus, Trash2, Calendar, CreditCard, 
    User, FileText, Loader2, ArrowLeft, Percent, Calculator, Scan,
    DollarSign, Receipt, ChevronRight, Hash
} from 'lucide-react';
import { getProductsForPOS, recordManualPOSSale } from '@/actions/pos-actions';
import { getPOSPaymentMethods } from '@/actions/payment-settings-actions';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

export default function POSPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const searchRef = useRef<HTMLInputElement>(null);
    
    const [products, setProducts] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    
    // Mode State
    const [scanMode, setScanMode] = useState(false);

    // POS Form State
    const [saleDate, setSaleDate] = useState(() => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value;
        return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
    });
    const [paymentMethod, setPaymentMethod] = useState('');
    const [notes, setNotes] = useState('');
    const [discount, setDiscount] = useState<number>(0); // RM discount
    const [cashReceived, setCashReceived] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            try {
                const [pData, pMethods] = await Promise.all([
                    getProductsForPOS(),
                    getPOSPaymentMethods()
                ]);
                setProducts(pData);
                setPaymentMethods(pMethods);
                if (pMethods.length > 0) setPaymentMethod(pMethods[0].id);
            } catch (e) {
                showToast('error', 'Failed to initialize POS');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Hotkey for search and Scan Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchRef.current) {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'F2') {
                setScanMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.name?.toLowerCase().includes(q) || 
            p.sku?.toLowerCase().includes(q)
        ).slice(0, 15);
    }, [products, searchQuery]);

    const addToCart = (product: any, variant?: any) => {
        const cartId = variant ? `${product.id}-${variant.sku}` : product.id;
        const existing = cart.find(item => item.cartId === cartId);

        if (existing) {
            setCart(cart.map(item => 
                item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                cartId,
                id: product.id,
                name: product.name,
                sku: variant ? variant.sku : product.sku,
                price: variant ? variant.price : (product.web_price || 0),
                variant_label: variant ? Object.values(variant.options).join(' / ') : undefined,
                selected_options: variant ? variant.options : undefined,
                quantity: 1
            }]);
        }
        setSearchQuery('');
        if (scanMode) searchRef.current?.focus();
    };

    // Auto-add if exact SKU match (for barcode scanners)
    useEffect(() => {
        if (scanMode && searchQuery.length >= 3) {
            for (const p of products) {
                if (p.sku === searchQuery) {
                    addToCart(p);
                    setSearchQuery('');
                    return;
                }
                if (p.variants) {
                    for (const v of p.variants) {
                        if (v.sku === searchQuery) {
                            addToCart(p, v);
                            setSearchQuery('');
                            return;
                        }
                    }
                }
            }
        }
    }, [searchQuery, scanMode]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal - discount);
    const change = cashReceived ? (parseFloat(cashReceived) - total) : 0;

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            const result = await recordManualPOSSale({
                items: cart,
                payment_method: paymentMethods.find(m => m.id === paymentMethod)?.label || paymentMethod,
                sale_date: new Date(saleDate).toISOString(),
                customer_notes: notes,
                total_amount: total
            });

            if (result.success) {
                showToast('success', 'Sale recorded successfully');
                setCart([]);
                setNotes('');
                setDiscount(0);
                setCashReceived('');
            } else {
                showToast('error', result.error || 'Failed to record sale');
            }
        } catch (e) {
            showToast('error', 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center text-gray-500 font-mono animate-pulse">INITIALIZING TERMINAL...</div>;

    return (
        <div className="max-w-[1800px] mx-auto pb-10 flex flex-col h-[calc(100vh-100px)]">
            {/* Minimal Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-1 hover:bg-gray-200 rounded">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-black uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                        <Scan size={20} className="text-blue-600" />
                        Rud'Ark <span className="text-blue-600">POS Terminal</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border ${scanMode ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${scanMode ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
                        {scanMode ? 'Scan Mode Active (F2)' : 'Manual Entry (F2)'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
                {/* Left: Product Selection */}
                <div className="lg:col-span-7 flex flex-col space-y-4 overflow-hidden">
                    <div className="bg-white border border-gray-200 p-4 shadow-sm shrink-0">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                ref={searchRef}
                                type="text"
                                autoFocus
                                placeholder={scanMode ? "Ready for Barcode..." : "Search product or SKU (press /)"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full bg-gray-50 border ${scanMode ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-200'} text-gray-900 pl-12 pr-4 py-3 focus:outline-none text-base font-bold placeholder-gray-300 transition-all uppercase`}
                            />
                        </div>

                        {searchQuery && !scanMode && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="border border-gray-100 p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group rounded-sm"
                                         onClick={() => (!product.variants || product.variants.length === 0) && addToCart(product)}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="text-xs font-black text-gray-900 uppercase truncate mb-1">{product.name}</h3>
                                                <p className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
                                                    <Hash size={10} /> {product.sku}
                                                </p>
                                            </div>
                                            {(!product.variants || product.variants.length === 0) && (
                                                <div className="text-xs font-bold text-blue-600">RM {product.web_price}</div>
                                            )}
                                        </div>
                                        {product.variants?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {product.variants.map((v: any) => (
                                                    <button
                                                        key={v.sku}
                                                        onClick={(e) => { e.stopPropagation(); addToCart(product, v); }}
                                                        className="bg-white border border-gray-200 hover:border-blue-600 px-2 py-1 text-[9px] font-bold text-gray-600 hover:text-blue-600 transition-all uppercase"
                                                    >
                                                        {Object.values(v.options).join('/')}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 flex-1 overflow-hidden flex flex-col shadow-sm">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Receipt size={14} className="text-blue-600" /> Current Invoice
                            </h2>
                            <button onClick={() => setCart([])} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Clear All</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr className="bg-white text-gray-400 text-[9px] uppercase font-bold tracking-widest border-b border-gray-100">
                                        <th className="py-2 px-4">Description</th>
                                        <th className="py-2 px-4 text-right">Price (Edit)</th>
                                        <th className="py-2 px-4 text-center">Qty</th>
                                        <th className="py-2 px-4 text-right">Ext. Price</th>
                                        <th className="py-2 px-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-32 text-center">
                                                <ShoppingCart size={48} className="mx-auto text-gray-100 mb-4" />
                                                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Waiting for items...</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map(item => (
                                            <tr key={item.cartId} className="hover:bg-gray-50 group">
                                                <td className="py-3 px-4">
                                                    <div className="text-[11px] font-bold text-gray-900 uppercase truncate max-w-[250px]">{item.name}</div>
                                                    <div className="text-[9px] text-gray-400 font-mono">{item.sku}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-[9px] text-gray-400">RM</span>
                                                        <input 
                                                            type="number"
                                                            value={item.price}
                                                            step="0.01"
                                                            onChange={(e) => {
                                                                const newPrice = parseFloat(e.target.value) || 0;
                                                                setCart(cart.map(i => i.cartId === item.cartId ? { ...i, price: newPrice } : i));
                                                            }}
                                                            className="w-16 bg-transparent border-b border-dashed border-gray-200 text-right text-[11px] font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => item.quantity > 1 && setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: i.quantity - 1 } : i))} className="w-5 h-5 border border-gray-200 text-gray-400 rounded-sm hover:text-red-500"><Minus size={10} /></button>
                                                        <span className="text-gray-900 font-bold font-mono text-xs w-4 text-center">{item.quantity}</span>
                                                        <button onClick={() => setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: i.quantity + 1 } : i))} className="w-5 h-5 border border-gray-200 text-gray-400 rounded-sm hover:text-blue-500"><Plus size={10} /></button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-900 font-bold font-mono text-[11px]">
                                                    {(item.price * item.quantity).toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Payments */}
                <div className="lg:col-span-5 space-y-4 flex flex-col overflow-hidden">
                    <div className="bg-gray-900 border border-gray-800 p-6 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                <span>Subtotal</span>
                                <span className="font-mono">RM {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-2">
                                    <Percent size={12} className="text-blue-500" /> Discount
                                </label>
                                <input 
                                    type="number" value={discount || ''}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="bg-black border border-gray-700 text-white px-2 py-1 text-right font-mono text-sm w-24 focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-gray-800">
                                <span className="text-white text-xs font-black uppercase">Grand Total</span>
                                <div className="text-4xl font-black text-blue-500 font-mono tracking-tighter leading-none">
                                    RM {total.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 p-6 flex-1 shadow-sm overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2"><CreditCard size={14} /> Payment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentMethods.map(m => (
                                        <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`py-3 px-4 text-[10px] font-black uppercase border transition-all ${paymentMethod === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-400'}`}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {paymentMethods.find(m => m.id === paymentMethod)?.label.toLowerCase().includes('cash') && (
                                <div className="bg-blue-50 p-4 border border-blue-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] text-blue-700 uppercase font-black">Cash Received</label>
                                        <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="bg-white border-2 border-blue-200 text-blue-900 px-3 py-2 text-right font-black text-lg w-32 focus:border-blue-600 outline-none" />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                        <span className="text-[10px] text-blue-700 uppercase font-black">Change Due</span>
                                        <span className={`text-xl font-black font-mono ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>RM {change.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-400 uppercase font-bold flex items-center gap-1"><Calendar size={12} /> Date</label>
                                    <input type="datetime-local" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 text-[10px] font-bold focus:border-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] text-gray-400 uppercase font-bold flex items-center gap-1"><FileText size={12} /> Note</label>
                                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal memo..." className="w-full bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 text-[10px] focus:border-blue-400" />
                                </div>
                            </div>

                            <button onClick={handleCheckout} disabled={cart.length === 0 || submitting || (paymentMethods.find(m => m.id === paymentMethod)?.label.toLowerCase().includes('cash') && change < 0)} className="w-full bg-gray-900 text-white py-4 font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-30">
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <>Complete Sale <ChevronRight size={20} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
