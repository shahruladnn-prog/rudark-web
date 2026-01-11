'use client';
import { useCart } from '@/context/cart-context';
import { createCheckoutSession } from '@/actions/checkout';
import { useRouter } from 'next/navigation';
import { getLatestProductFees } from '@/actions/cart-actions';
import { validatePromoCode } from '@/actions/promo-actions';
import { checkShippingRates } from '@/actions/shipping-actions';
import { getShippingSettings } from '@/actions/shipping-settings-actions';
import { getCollectionSettings } from '@/actions/collection-settings-actions';
import { checkMultipleStock } from '@/actions/check-loyverse-stock';
import { ShippingSettings, DEFAULT_SHIPPING_SETTINGS } from '@/types/shipping-settings';
import { CollectionSettings, DEFAULT_COLLECTION_SETTINGS, CollectionPoint } from '@/types/collection-settings';
import FreeShippingProgress from '@/components/checkout/free-shipping-progress';
import { getStateFromPostcode } from '@/utils/postcode-state-mapping';
import { useDialog } from '@/components/ui/dialog';
import { Tag, CheckCircle, AlertCircle, MapPin, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-rudark-volt text-black p-4 font-condensed font-bold text-xl uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
        >
            {pending ? 'Processing Secure Payment...' : 'Confirm & Pay'}
        </button>
    );
}

export default function CheckoutPage() {
    const { cart, subtotal, totalItems, clearCart, removeFromCart, updateQuantity } = useCart();
    const dialog = useDialog();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Delivery Method State
    const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'self_collection'>('delivery');
    const [collectionSettings, setCollectionSettings] = useState<CollectionSettings>(DEFAULT_COLLECTION_SETTINGS);
    const [selectedCollectionPoint, setSelectedCollectionPoint] = useState<string>('');

    // Shipping State
    const [postcode, setPostcode] = useState('');
    const [rates, setRates] = useState<any[]>([]);
    const [selectedRate, setSelectedRate] = useState<any>(null);
    const [loadingRates, setLoadingRates] = useState(false);
    const [shippingError, setShippingError] = useState('');

    // Fresh Fees State (Server Validation)
    const [feeMap, setFeeMap] = useState<Record<string, any>>({});

    // Free Shipping State
    const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
    const [freeShippingApplied, setFreeShippingApplied] = useState(false);

    // Promo State
    const [promoCode, setPromoCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [promoMessage, setPromoMessage] = useState('');
    const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // State Detection
    const [detectedState, setDetectedState] = useState('');

    // Auto-detect state from postcode
    useEffect(() => {
        if (postcode.length === 5) {
            const state = getStateFromPostcode(postcode);
            setDetectedState(state);
        } else {
            setDetectedState('');
        }
    }, [postcode]);

    // Fetch Fresh Fees when cart items change (but debounced)
    useEffect(() => {
        if (cart.length === 0) return;

        // Debounce to avoid excessive calls
        const timer = setTimeout(async () => {
            const ids = cart.map(item => item.id).filter(Boolean) as string[];
            const freshFees = await getLatestProductFees(ids);
            setFeeMap(freshFees);
        }, 500); // Wait 500ms after last cart change

        return () => clearTimeout(timer);
    }, [cart.length]); // Use length instead of full array

    // Fetch Shipping Settings on Mount
    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await getShippingSettings();
            setShippingSettings(settings);
        };
        fetchSettings();
    }, []);

    // Fetch Collection Settings on Mount
    useEffect(() => {
        const fetchCollectionSettings = async () => {
            const settings = await getCollectionSettings();
            setCollectionSettings(settings);
        };
        fetchCollectionSettings();
    }, []);

    // Derived Calculations (Using Fresh Data if available)
    const totalWeight = cart.reduce((sum, item) => sum + ((item.weight || 0.1) * item.quantity), 0);

    // Handling: Sum of all item handling fees (Prefer Fresh Map)
    const totalHandling = cart.reduce((sum, item) => {
        const fee = feeMap[item.id!]?.handling_fee ?? item.handling_fee ?? 0;
        return sum + (fee * item.quantity);
    }, 0);

    // Markup: Find highest markup percentage in cart (Prefer Fresh Map)
    const maxMarkupPercent = cart.reduce((max, item) => {
        const percent = feeMap[item.id!]?.shipping_markup_percent ?? item.shipping_markup_percent ?? 0;
        return Math.max(max, percent);
    }, 0);

    // Add state for tracking if rates have been calculated
    const [ratesCalculated, setRatesCalculated] = useState(false);

    // Manual shipping rate calculation function
    const calculateShippingRates = async () => {
        // Validation
        if (!postcode || postcode.length !== 5) {
            setShippingError('Please enter a valid 5-digit postcode');
            return;
        }

        if (cart.length === 0) {
            setShippingError('Cart is empty');
            return;
        }

        setLoadingRates(true);
        setShippingError('');

        try {
            // Call Server Action
            const result = await checkShippingRates(postcode, totalWeight);

            if (result.success && result.rates) {
                setRates(result.rates);
                setRatesCalculated(true);

                // Auto-select cheapest rate
                if (result.rates.length > 0) {
                    const cheapest = result.rates.reduce((min: any, rate: any) =>
                        rate.price < min.price ? rate : min
                    );
                    setSelectedRate(cheapest);
                }
            } else {
                setShippingError(result.error || 'No shipping options found for this area.');
                setRates([]);
            }
        } catch (error) {
            setShippingError('Failed to fetch shipping rates');
            console.error('Shipping rate error:', error);
        } finally {
            setLoadingRates(false);
        }
    };

    // Detect if cart changed after rates calculated (warn user to recalculate)
    useEffect(() => {
        if (ratesCalculated && cart.length > 0) {
            const currentWeight = cart.reduce((sum, item) => sum + ((item.weight || 0.1) * item.quantity), 0);
            if (Math.abs(currentWeight - totalWeight) > 0.01) {
                setRatesCalculated(false);
                setSelectedRate(null);
            }
        }
    }, [cart, ratesCalculated, totalWeight]);


    const calculateFinalShipping = (baseRate: number) => {
        const markupAmount = baseRate * (maxMarkupPercent / 100);
        return baseRate + markupAmount + totalHandling;
    };

    // Calculate shipping cost (with free shipping check)
    let finalShippingCost = selectedRate ? calculateFinalShipping(selectedRate.price) : 0;

    // Check if order qualifies for free shipping (async check moved to useEffect)
    useEffect(() => {
        const checkFreeShipping = async () => {
            if (!shippingSettings.free_shipping_enabled) {
                setFreeShippingApplied(false);
                return;
            }

            const { qualifiesForFreeShipping } = await import('@/actions/shipping-settings-actions');
            const qualifies = await qualifiesForFreeShipping(subtotal, cart);
            setFreeShippingApplied(qualifies);
        };
        checkFreeShipping();
    }, [subtotal, cart, shippingSettings.free_shipping_enabled]);

    // Apply free shipping if qualified
    if (freeShippingApplied) {
        finalShippingCost = 0;
    }

    const applyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setPromoStatus('idle');
        const res = await validatePromoCode(promoCode, subtotal);
        if (res.valid && res.discountAmount) {
            setAppliedDiscount(res.discountAmount);
            setPromoStatus('success');
            setPromoMessage(`-${res.code} Applied: RM${res.discountAmount.toFixed(2)} Off`);
        } else {
            setAppliedDiscount(0);
            setPromoStatus('error');
            setPromoMessage(res.message || 'Invalid Code');
        }
    };

    // Calculate collection fee or shipping cost
    const deliveryCost = deliveryMethod === 'self_collection'
        ? (selectedCollectionPoint
            ? (collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint)?.collection_fee || 0)
            : 0)
        : finalShippingCost;

    const finalTotal = subtotal + deliveryCost - appliedDiscount;

    if (cart.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-rudark-matte text-white p-4">
                <h1 className="text-3xl font-condensed font-bold mb-4 uppercase">Your cart is empty</h1>
                <a href="/" className="text-rudark-volt hover:text-white underline font-mono">Return to Base</a>
            </div>
        );
    }

    async function onSubmit(formData: FormData) {
        setErrorMessage(null);

        // Validate delivery method
        if (deliveryMethod === 'self_collection') {
            // Validate collection point selected
            if (!selectedCollectionPoint) {
                setErrorMessage('Please select a collection point');
                return;
            }
        } else {
            // Validate shipping calculated and selected (only for delivery)
            if (!ratesCalculated) {
                setErrorMessage('Please calculate shipping rates first');
                return;
            }

            if (!selectedRate) {
                setErrorMessage("Please select a shipping method.");
                return;
            }
        }

        // ✅ NEW: Validate stock for entire cart
        setErrorMessage('Validating stock availability...');

        try {
            const cartItems = cart.map(item => ({
                sku: item.sku,
                quantity: item.quantity,
                name: item.name
            }));

            const stockValidation = await checkMultipleStock(cartItems);

            if (!stockValidation.success) {
                setErrorMessage(
                    'Stock validation failed:\n\n' +
                    stockValidation.errors.join('\n')
                );
                return;
            }

            // Stock validated, proceed to payment
            setErrorMessage(null);

        } catch (error) {
            console.error('Stock validation error:', error);
            setErrorMessage('Failed to validate stock. Please try again.');
            return;
        }

        formData.append('appliedDiscount', appliedDiscount.toString());
        formData.append('shippingCost', finalShippingCost.toFixed(2));
        formData.append('shippingProvider', selectedRate.provider_code);
        formData.append('shippingService', selectedRate.service_type);

        const result = await createCheckoutSession(null, formData);
        if (result?.error) {
            setErrorMessage(result.error);
        }
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.png')] bg-fixed">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* 1. Order Summary Column (Mobile: Top, Desktop: Right - wait, flex order? No, native order implies Left/Top) */}
                {/* Ideally Details on Left, Summary on Right. But keeping current order to preserve logic if user wants summary first on mobile */}

                {/* Let's swap visual order on desktop to standard: Form Left, Summary Right. */}
                {/* On mobile, usually Summary is collapsible or at bottom. But let's stick to simple grid first. */}

                {/* ACTUALLY, checking previous code... it had "Left Column: Form" comment but then rendered Order Summary logic??? 
                   The previous code was mixed up. 
                   I will put the FORM first in the DOM if we want it on Left, OR use order-last on summary. 
                   Let's assume:
                   Col 1: Details (Form)
                   Col 2: Summary (Sticky)
                */}

                {/* COLUMN 1: SHIPPING DETAILS FORM */}
                <div className="order-2 lg:order-1">
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey/50">
                        <h2 className="text-xl font-condensed font-bold mb-6 uppercase text-gray-200">Logistics Data</h2>

                        {errorMessage && (
                            <div className="bg-red-900/30 border border-red-500 text-red-100 p-4 mb-6 text-sm font-mono">
                                [ERROR]: {errorMessage}
                            </div>
                        )}

                        <form action={onSubmit} className="space-y-5">
                            <input type="hidden" name="cart" value={JSON.stringify(cart)} />
                            <input type="hidden" name="appliedDiscount" value={appliedDiscount.toFixed(2)} />
                            <input type="hidden" name="shippingCost" value={finalShippingCost.toFixed(2)} />
                            <input type="hidden" name="shippingProvider" value={selectedRate?.provider_code || ''} />
                            <input type="hidden" name="shippingService" value={selectedRate?.service_type || ''} />
                            <input type="hidden" name="delivery_method" value={deliveryMethod} />
                            {selectedCollectionPoint && (
                                <>
                                    <input type="hidden" name="collection_point_id" value={selectedCollectionPoint} />
                                    <input type="hidden" name="collection_point_name" value={collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint)?.name || ''} />
                                    <input type="hidden" name="collection_point_address" value={collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint)?.address || ''} />
                                    <input type="hidden" name="collection_fee" value={collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint)?.collection_fee || 0} />
                                </>
                            )}

                            {/* Delivery Method Selector */}
                            <div className="mb-6">
                                <h3 className="text-lg font-condensed font-bold mb-4 uppercase text-gray-200">Delivery Method</h3>
                                <div className="space-y-3">
                                    {/* Home Delivery */}
                                    <label className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${deliveryMethod === 'delivery'
                                        ? 'border-rudark-volt bg-rudark-volt/10'
                                        : 'border-rudark-grey hover:border-gray-500'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="delivery_method_radio"
                                            value="delivery"
                                            checked={deliveryMethod === 'delivery'}
                                            onChange={() => setDeliveryMethod('delivery')}
                                            className="w-4 h-4"
                                        />
                                        <Truck size={24} className={deliveryMethod === 'delivery' ? 'text-rudark-volt' : 'text-gray-400'} />
                                        <div className="flex-1">
                                            <div className="font-bold text-white">Home Delivery</div>
                                            <div className="text-sm text-gray-400">We'll ship to your address</div>
                                        </div>
                                    </label>

                                    {/* Self Collection */}
                                    {collectionSettings.enabled && collectionSettings.collection_points.filter(p => p.is_active).length > 0 && (
                                        <label className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${deliveryMethod === 'self_collection'
                                            ? 'border-rudark-volt bg-rudark-volt/10'
                                            : 'border-rudark-grey hover:border-gray-500'
                                            }`}>
                                            <input
                                                type="radio"
                                                name="delivery_method_radio"
                                                value="self_collection"
                                                checked={deliveryMethod === 'self_collection'}
                                                onChange={() => setDeliveryMethod('self_collection')}
                                                className="w-4 h-4"
                                            />
                                            <MapPin size={24} className={deliveryMethod === 'self_collection' ? 'text-rudark-volt' : 'text-gray-400'} />
                                            <div className="flex-1">
                                                <div className="font-bold text-white">Self-Collection</div>
                                                <div className="text-sm text-gray-400">Pick up at our location</div>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Collection Point Selector (if self-collection) */}
                            {deliveryMethod === 'self_collection' && (
                                <div className="mb-6 p-4 bg-rudark-matte border border-rudark-volt/30 rounded-sm">
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Select Collection Point</label>
                                    <select
                                        value={selectedCollectionPoint}
                                        onChange={(e) => setSelectedCollectionPoint(e.target.value)}
                                        required={deliveryMethod === 'self_collection'}
                                        className="w-full bg-rudark-carbon border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                    >
                                        <option value="">-- Choose Location --</option>
                                        {collectionSettings.collection_points
                                            .filter(p => p.is_active)
                                            .map(point => (
                                                <option key={point.id} value={point.id}>
                                                    {point.name} - RM {point.collection_fee.toFixed(2)}
                                                </option>
                                            ))
                                        }
                                    </select>

                                    {/* Show selected point details */}
                                    {selectedCollectionPoint && (() => {
                                        const point = collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint);
                                        return point ? (
                                            <div className="mt-3 p-3 bg-rudark-carbon rounded-sm text-sm">
                                                <div className="font-bold text-white mb-1">{point.name}</div>
                                                <div className="text-gray-400 mb-1">{point.address}</div>
                                                <div className="text-gray-400 mb-1">{point.postcode}, {point.state}</div>
                                                {point.operating_hours && (
                                                    <div className="text-gray-500 text-xs">Hours: {point.operating_hours}</div>
                                                )}
                                                {point.contact_phone && (
                                                    <div className="text-gray-500 text-xs">Phone: {point.contact_phone}</div>
                                                )}
                                                <div className="mt-2 text-rudark-volt font-bold">
                                                    Collection Fee: RM {point.collection_fee.toFixed(2)}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Full Name</label>
                                <input name="name" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="OPERATIVE NAME" />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Comms Contact</label>
                                <input name="phone" type="tel" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="+60 12-345 6789" />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Email Address</label>
                                <input name="email" type="email" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="email@example.com" />
                            </div>

                            {/* Shipping Address Fields (only for delivery) */}
                            {deliveryMethod === 'delivery' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Dropzone Address</label>
                                        <textarea name="address" required rows={3} className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="FULL SHIPPING ADDRESS"></textarea>
                                    </div>

                                    {/* Postcode & State Row */}
                                    <div className="flex gap-4">
                                        <div className="w-1/3">
                                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Postcode</label>
                                            <input
                                                name="postcode"
                                                type="text"
                                                required
                                                maxLength={5}
                                                value={postcode}
                                                onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none font-mono text-center tracking-widest"
                                                placeholder="00000"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">State</label>
                                            <input
                                                name="state"
                                                required
                                                readOnly
                                                value={detectedState}
                                                className="w-full bg-rudark-charcoal border border-rudark-grey rounded-sm p-3 text-gray-400 cursor-not-allowed transition-colors"
                                                placeholder="Auto-detected..."
                                            />
                                        </div>
                                    </div>

                                    {/* Calculate Shipping Button */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={calculateShippingRates}
                                            disabled={loadingRates || postcode.length !== 5 || cart.length === 0}
                                            className="w-full px-4 py-3 bg-rudark-volt text-black font-bold rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                                        >
                                            {loadingRates ? (
                                                <>
                                                    <span className="inline-block animate-spin mr-2">⏳</span>
                                                    Calculating Rates...
                                                </>
                                            ) : (
                                                '📦 Calculate Shipping'
                                            )}
                                        </button>

                                        {/* Helper Text */}
                                        {postcode.length === 5 && !ratesCalculated && !loadingRates && (
                                            <p className="text-xs text-blue-400 mt-2 font-mono">
                                                💡 Click to see available delivery options
                                            </p>
                                        )}

                                        {/* Cart Changed Warning */}
                                        {!ratesCalculated && rates.length > 0 && (
                                            <p className="text-xs text-orange-400 mt-2 font-mono">
                                                ⚠️ Cart changed. Please recalculate shipping.
                                            </p>
                                        )}
                                    </div>

                                    {/* Shipping Options */}
                                    <div className="pt-4 border-t border-rudark-grey/30">
                                        <label className="block text-xs font-mono text-rudark-volt mb-3 uppercase">Shipping Method</label>

                                        {loadingRates ? (
                                            <div className="bg-black/20 p-4 rounded text-center animate-pulse">
                                                <span className="text-xs font-mono text-rudark-volt">CALCULATING RATES...</span>
                                            </div>
                                        ) : shippingError ? (
                                            <div className="bg-red-900/10 border border-red-900/30 p-3 text-red-400 text-xs font-mono">
                                                <p className="mb-2">{shippingError}</p>
                                            </div>
                                        ) : rates.length > 0 ? (
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-rudark-grey">
                                                {rates.map((rate, idx) => {
                                                    const finalCost = calculateFinalShipping(rate.price);
                                                    const isSelected = selectedRate?.provider_code === rate.provider_code && selectedRate?.service_type === rate.service_type;

                                                    return (
                                                        <div
                                                            key={`${rate.provider_code}-${idx}`}
                                                            onClick={() => setSelectedRate(rate)}
                                                            className={`
                                                        p-3 border rounded-sm cursor-pointer transition-all flex justify-between items-center group
                                                        ${isSelected
                                                                    ? 'bg-rudark-volt/10 border-rudark-volt text-white'
                                                                    : 'bg-black/20 border-gray-700 text-gray-400 hover:border-gray-500'
                                                                }
                                                    `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-3 h-3 rounded-full border ${isSelected ? 'border-rudark-volt bg-rudark-volt' : 'border-gray-600'}`}></div>
                                                                <div className="flex flex-col">
                                                                    <span className={`text-xs font-bold uppercase ${isSelected ? 'text-white' : 'text-gray-300'}`}>{rate.provider_name}</span>
                                                                    <span className="text-[10px] font-mono opacity-70">{rate.service_type} ({rate.estimated_days} Days)</span>
                                                                </div>
                                                            </div>
                                                            <span className={`font-mono text-sm font-bold ${isSelected ? 'text-rudark-volt' : 'text-gray-500'}`}>
                                                                RM {finalCost.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-black/20 p-4 rounded text-center border border-dashed border-gray-700">
                                                <span className="text-xs font-mono text-gray-500">
                                                    {postcode.length >= 5 ? "NO SHIPPING OPTIONS AVAILABLE" : "ENTER POSTCODE TO SEE RATES"}
                                                </span>
                                            </div>
                                        )}


                                    </div>
                                </>
                            )}

                            <div className="pt-6">
                                <SubmitButton />
                            </div>

                            <p className="text-[10px] text-gray-500 text-center font-mono uppercase tracking-widest mt-4">
                                Encrypted Transaction via BizApp Pay
                            </p>
                        </form>
                    </div>
                </div>

                {/* COLUMN 2: ORDER SUMMARY (Sticky) */}
                <div className="order-1 lg:order-2">
                    <div className="bg-rudark-carbon p-6 md:p-8 rounded-sm border border-rudark-grey h-fit sticky top-32">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-condensed font-bold text-white uppercase tracking-wide">Order Summary</h3>
                            <button
                                type="button"
                                onClick={async () => {
                                    const confirmed = await dialog.confirm({
                                        title: 'Clear Cart',
                                        message: 'Remove all items from your cart?',
                                        confirmText: 'Clear All',
                                        cancelText: 'Cancel'
                                    });
                                    if (confirmed) clearCart();
                                }}
                                className="px-3 py-1 bg-rudark-matte border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-wider rounded"
                            >
                                🗑️ Clear All
                            </button>
                        </div>

                        {/* Free Shipping Progress Indicator */}
                        <FreeShippingProgress subtotal={subtotal} className="mb-6" />

                        <div className="space-y-4 mb-6">
                            {cart.map((item) => {
                                const handleQuantityChange = async (newQty: number) => {
                                    if (newQty === 0) {
                                        // Smart remove: confirm when reducing from 1 to 0
                                        const confirmed = await dialog.confirm({
                                            title: 'Remove Item',
                                            message: `Remove "${item.name}" from cart?`,
                                            confirmText: 'Remove',
                                            cancelText: 'Keep'
                                        });
                                        if (confirmed) {
                                            removeFromCart(item.sku, item.selected_options);
                                        }
                                    } else {
                                        updateQuantity(item.sku, newQty, item.selected_options);
                                    }
                                };

                                return (
                                    <div key={`${item.sku}-${JSON.stringify(item.selected_options)}`} className="border-b border-rudark-grey/30 pb-3">
                                        <div className="flex justify-between items-start text-sm mb-2">
                                            <div className="flex-1">
                                                <span className="text-gray-400 capitalize flex-1">{item.name}</span>
                                                {/* Display selected variant options */}
                                                {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {Object.entries(item.selected_options).map(([key, value]) => (
                                                            <span key={key} className="mr-2">
                                                                {key}: <span className="text-rudark-volt">{value}</span>
                                                            </span>
                                                        ))}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-white font-mono ml-2">
                                                RM {((item.promo_price || item.web_price) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.quantity - 1)}
                                                className="w-6 h-6 bg-rudark-matte border border-rudark-grey rounded flex items-center justify-center hover:border-rudark-volt transition-colors text-white text-xs font-bold"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center font-mono text-white text-xs">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.quantity + 1)}
                                                className="w-6 h-6 bg-rudark-matte border border-rudark-grey rounded flex items-center justify-center hover:border-rudark-volt transition-colors text-white text-xs font-bold"
                                            >
                                                +
                                            </button>
                                            <span className="text-xs text-gray-500 font-mono ml-2">
                                                RM {(item.promo_price || item.web_price).toFixed(2)} each
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-rudark-grey my-4 pt-4 space-y-2">
                            <div className="flex justify-between items-center text-gray-400 text-sm">
                                <span>Subtotal</span>
                                <span className="font-mono">RM {subtotal.toFixed(2)}</span>
                            </div>

                            {/* Shipping or Collection Fee */}
                            {deliveryMethod === 'self_collection' ? (
                                <div className="flex justify-between items-center text-gray-400 text-sm">
                                    <span>Collection Fee</span>
                                    <span className="font-mono">
                                        {selectedCollectionPoint
                                            ? `RM ${(collectionSettings.collection_points.find(p => p.id === selectedCollectionPoint)?.collection_fee || 0).toFixed(2)}`
                                            : '--'
                                        }
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center text-gray-400 text-sm">
                                        <span>Shipping</span>
                                        <span className="font-mono">{selectedRate ? `RM ${finalShippingCost.toFixed(2)}` : '--'}</span>
                                    </div>

                                    {/* Debug / Info for User */}
                                    <div className="text-[10px] text-gray-600 font-mono text-right flex flex-col">
                                        <span>Weight: {totalWeight.toFixed(2)}kg</span>
                                        {totalHandling > 0 && <span>Includes Handling</span>}
                                    </div>
                                </>
                            )}

                            {/* Promo Code Input */}
                            <div className="py-2">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="PROMO CODE"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                            className="w-full bg-rudark-matte text-white pl-9 pr-3 py-2 text-sm border border-rudark-grey focus:border-rudark-volt focus:outline-none font-mono uppercase rounded-sm"
                                            disabled={promoStatus === 'success'}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        className="px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm hover:bg-white transition-colors text-sm uppercase tracking-wide"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {promoMessage && (
                                    <div className={`mt-2 text-xs flex items-center gap-1.5 ${promoStatus === 'success' ? 'text-rudark-volt' : 'text-red-400'}`}>
                                        {promoStatus === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                        {promoMessage}
                                    </div>
                                )}
                            </div>

                            {appliedDiscount > 0 && (
                                <div className="flex justify-between items-center text-rudark-volt text-sm">
                                    <span>Discount</span>
                                    <span className="font-mono">- RM {appliedDiscount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xl font-bold text-white pt-2 border-t border-rudark-grey mt-2">
                                <span className="font-condensed uppercase">TOTAL</span>
                                <span className="font-mono text-rudark-volt">RM {finalTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
