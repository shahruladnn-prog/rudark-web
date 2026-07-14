'use client';

import { useState, useMemo, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Product, ProductVariant } from '@/types';
import { createPreOrder } from '@/actions/pre-order-actions';
import { PRE_ORDER_ADDONS, priceAddonLines, priceAddonsSubtotal } from '@/lib/pre-order-addons';
import { validPrice } from '@/lib/variant-utils';
import PreorderGallery from '@/components/preorder/preorder-gallery';
import { Truck, X } from 'lucide-react';

function ConfirmButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-rudark-volt text-black p-4 font-condensed font-bold text-xl uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
        >
            {pending ? 'Processing...' : 'Confirm & Pay Deposit'}
        </button>
    );
}

export default function PreorderForm({ product }: { product: Product }) {
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [customerSnapshot, setCustomerSnapshot] = useState<Record<string, string>>({});

    const formRef = useRef<HTMLFormElement>(null);

    const hasOptions = (product.options || []).length > 0;
    const optionsMissing = hasOptions && !activeVariant;

    // Reflects the selected variant's actual price (e.g. a 14ft boat costs more than
    // a 12ft one) rather than always showing the base product's price.
    const unitPrice = activeVariant
        ? validPrice(activeVariant.price, activeVariant.promo_price)
        : validPrice(product.web_price, product.promo_price);
    const depositPercent = product.pre_order_deposit_percent || 100;
    const boatSubtotal = unitPrice * quantity;

    const addonLines = useMemo(() => priceAddonLines(addonQuantities), [addonQuantities]);
    const addonsSubtotal = useMemo(() => priceAddonsSubtotal(addonQuantities), [addonQuantities]);

    const subtotal = boatSubtotal + addonsSubtotal;
    const depositAmount = Math.round(subtotal * depositPercent / 100 * 100) / 100;
    const balanceAmount = Math.round((subtotal - depositAmount) * 100) / 100;

    const sizeSpec = useMemo(() => {
        const size = selectedOptions['Size'];
        if (!size) return null;
        const anySizeVariant = (product.variants || []).find(v => v.options?.Size === size && v.spec);
        return anySizeVariant?.spec || null;
    }, [selectedOptions, product.variants]);

    async function onSubmit(formData: FormData) {
        setErrorMessage(null);
        const result = await createPreOrder(null, formData);
        if (result?.error) {
            setErrorMessage(result.error);
            setShowSummary(false);
        }
    }

    function handleReviewOrder() {
        setErrorMessage(null);

        if (optionsMissing) {
            setErrorMessage('Please select an option before pre-ordering.');
            return;
        }

        // Trigger native required-field validation without actually submitting,
        // so the customer fixes missing fields before seeing the review modal.
        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        const snapshot = new FormData(formRef.current!);
        setCustomerSnapshot({
            name: (snapshot.get('name') as string) || '',
            email: (snapshot.get('email') as string) || '',
            phone: (snapshot.get('phone') as string) || '',
            address: (snapshot.get('address') as string) || '',
            postcode: (snapshot.get('postcode') as string) || '',
            city: (snapshot.get('city') as string) || '',
        });
        setShowSummary(true);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <PreorderGallery
                product={product}
                onSelectionChange={(options, variant) => {
                    setSelectedOptions(options);
                    setActiveVariant(variant);
                }}
            />

            <div>
                <h1 className="text-3xl md:text-4xl font-condensed font-bold uppercase mb-2">{product.name}</h1>
                {product.pre_order_eta && (
                    <p className="text-rudark-volt font-mono text-sm uppercase tracking-widest mb-4">
                        Estimated availability: {product.pre_order_eta}
                    </p>
                )}
                <p className="text-gray-400 mb-4">{product.description}</p>

                {sizeSpec && sizeSpec.length > 0 && (
                    <div className="bg-black/40 border border-rudark-grey/50 rounded-sm p-4 mb-4 text-sm text-gray-300 space-y-1">
                        <p className="text-rudark-volt font-mono text-xs uppercase tracking-widest mb-2">
                            {selectedOptions['Size']} Specifications
                        </p>
                        {sizeSpec.map(line => (
                            <div key={line.label} className="flex justify-between">
                                <span className="text-gray-500">{line.label}</span>
                                <span>{line.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-black/40 border border-rudark-grey/50 rounded-sm p-4 mb-4 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-300">
                        <span>{product.name} (x{quantity})</span>
                        <span>RM {boatSubtotal.toFixed(2)}</span>
                    </div>
                    {addonsSubtotal > 0 && (
                        <div className="flex justify-between text-gray-300">
                            <span>Add-ons</span>
                            <span>RM {addonsSubtotal.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-300 border-t border-rudark-grey/30 pt-1">
                        <span>Total</span>
                        <span>RM {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold">
                        <span>Deposit due now ({depositPercent}%)</span>
                        <span>RM {depositAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-500 pt-2">
                        The remaining balance will be collected once your item is ready.
                    </p>
                </div>

                {/* Free shipping promo callout */}
                <div className="flex items-start gap-3 bg-rudark-volt/10 border border-rudark-volt/40 rounded-sm p-4 mb-6">
                    <Truck className="text-rudark-volt shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="text-rudark-volt font-bold uppercase tracking-wide">Free Shipping Included</p>
                        <p className="text-gray-300 mt-1">
                            Shipping normally costs RM300–500 in West Malaysia (more for East Malaysia) — it's on us for every Pre-Order placed during this promo.
                        </p>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-900/30 border border-red-500 text-red-100 p-4 mb-6 text-sm">
                        {errorMessage}
                    </div>
                )}

                <form ref={formRef} action={onSubmit} className="space-y-4">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="selected_options" value={activeVariant ? JSON.stringify(activeVariant.options) : ''} />

                    <div>
                        <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Quantity</label>
                        <input
                            type="number"
                            name="quantity"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Full Name</label>
                        <input name="name" type="text" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Email</label>
                            <input name="email" type="email" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Phone</label>
                            <input name="phone" type="tel" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Address</label>
                        <input name="address" type="text" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Postcode</label>
                            <input name="postcode" type="text" required maxLength={5} className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none font-mono tracking-widest" />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">City</label>
                            <input name="city" type="text" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none" />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-rudark-grey/30">
                        <label className="block text-xs font-mono text-rudark-volt mb-3 uppercase">Add-ons (optional)</label>
                        <div className="space-y-3">
                            {PRE_ORDER_ADDONS.map(addon => (
                                <div key={addon.id} className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm text-white">{addon.name}</div>
                                        <div className="text-xs text-gray-500">
                                            RM {addon.price}
                                            {addon.normalPrice ? ` (NP RM${addon.normalPrice})` : ''}
                                            {addon.id === 'custom_patch' ? ` /pc + RM${(addon as any).moldFee} mold fee (once)` : ' /pc'}
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        name={`addon_${addon.id}`}
                                        min={0}
                                        value={addonQuantities[addon.id] || 0}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            setAddonQuantities(prev => ({ ...prev, [addon.id]: val }));
                                        }}
                                        className="w-20 bg-rudark-matte border border-rudark-grey rounded-sm p-2 text-white text-center focus:border-rudark-volt focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {!showSummary && (
                        <button
                            type="button"
                            onClick={handleReviewOrder}
                            disabled={optionsMissing}
                            className="w-full bg-rudark-volt text-black p-4 font-condensed font-bold text-xl uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                        >
                            Pre-Order Now
                        </button>
                    )}

                    {/* Order confirmation modal — lives inside the <form> so ConfirmButton's
                        native submit still fires this form's action with all current fields. */}
                    {showSummary && (
                        <>
                            <div
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] animate-[fadeIn_0.2s_ease-out]"
                                onClick={() => setShowSummary(false)}
                            />
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                <div
                                    className="bg-rudark-carbon border-2 border-rudark-grey rounded-sm shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-[scaleIn_0.3s_ease-out]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="bg-rudark-volt text-black px-6 py-4 flex items-center justify-between">
                                        <h2 className="font-condensed font-bold text-xl uppercase tracking-wide">Confirm Your Pre-Order</h2>
                                        <button type="button" onClick={() => setShowSummary(false)} className="hover:opacity-70 transition-opacity">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="px-6 py-5 space-y-4 text-sm">
                                        <div>
                                            <p className="text-rudark-volt font-mono text-xs uppercase tracking-widest mb-2">Item</p>
                                            <div className="flex justify-between text-white">
                                                <span>{product.name}{activeVariant ? ` (${Object.values(activeVariant.options).join(', ')})` : ''} x{quantity}</span>
                                                <span>RM {boatSubtotal.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {addonLines.length > 0 && (
                                            <div>
                                                <p className="text-rudark-volt font-mono text-xs uppercase tracking-widest mb-2">Add-ons</p>
                                                <div className="space-y-1">
                                                    {addonLines.map(line => (
                                                        <div key={line.sku} className="flex justify-between text-gray-300">
                                                            <span>{line.name} x{line.quantity}</span>
                                                            <span>RM {(line.web_price * line.quantity).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-rudark-volt font-mono text-xs uppercase tracking-widest mb-2">Ship To</p>
                                            <p className="text-gray-300">{customerSnapshot.name}</p>
                                            <p className="text-gray-300">{customerSnapshot.address}, {customerSnapshot.postcode} {customerSnapshot.city}</p>
                                            <p className="text-gray-300">{customerSnapshot.email} · {customerSnapshot.phone}</p>
                                        </div>

                                        <div className="border-t border-rudark-grey/30 pt-3 space-y-1">
                                            <div className="flex justify-between text-gray-300">
                                                <span>Shipping</span>
                                                <span className="text-rudark-volt font-bold">FREE</span>
                                            </div>
                                            <div className="flex justify-between text-gray-300">
                                                <span>Total</span>
                                                <span>RM {subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-white font-bold text-base">
                                                <span>Deposit due now ({depositPercent}%)</span>
                                                <span>RM {depositAmount.toFixed(2)}</span>
                                            </div>
                                            {balanceAmount > 0 && (
                                                <div className="flex justify-between text-gray-500">
                                                    <span>Balance due later</span>
                                                    <span>RM {balanceAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 border-t border-rudark-grey space-y-3">
                                        <ConfirmButton />
                                        <button
                                            type="button"
                                            onClick={() => setShowSummary(false)}
                                            className="w-full bg-transparent border-2 border-rudark-grey text-white hover:border-rudark-volt hover:text-rudark-volt transition-colors font-condensed uppercase tracking-wider text-sm rounded-sm py-2"
                                        >
                                            Back &amp; Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
