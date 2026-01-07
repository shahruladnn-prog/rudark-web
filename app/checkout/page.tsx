'use client';

import { useCart } from '@/context/cart-context';
import { createCheckoutSession } from '@/actions/checkout';
import { useRouter } from 'next/navigation';
import { validatePromoCode } from '@/actions/promo-actions';
import { Tag, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
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
    const { cart, subtotal, totalItems } = useCart();
    const [shippingZone, setShippingZone] = useState<'Peninsular' | 'Sabah/Sarawak'>('Peninsular');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // State for promo
    const [promoCode, setPromoCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [promoMessage, setPromoMessage] = useState('');
    const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const shippingCost = shippingZone === 'Peninsular' ? 10 : 20;
    const total = subtotal + shippingCost; // This is the total before discount

    const handleApplyPromo = async () => {
        if (!promoCode) return;
        setPromoStatus('idle');

        const res = await validatePromoCode(promoCode, total); // Use 'total' as the amount for promo validation

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

    const finalTotal = total - appliedDiscount;

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
        // Add appliedDiscount to formData
        formData.append('appliedDiscount', appliedDiscount.toString());
        const result = await createCheckoutSession(null, formData);
        if (result?.error) {
            setErrorMessage(result.error);
        }
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white py-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-condensed font-bold mb-8 uppercase border-b border-rudark-grey pb-4">
                    Secure Checkout
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Order Summary */}
                    <div className="bg-rudark-carbon p-6 md:p-8 rounded-sm border border-rudark-grey h-fit sticky top-24">
                        <h3 className="text-xl font-condensed font-bold text-white uppercase mb-6 tracking-wide">Order Summary</h3>

                        <div className="space-y-4 mb-6">
                            {cart.map((item) => (
                                <div key={item.sku} className="flex justify-between items-start text-sm">
                                    <span className="text-gray-400 capitalize w-2/3">
                                        {item.quantity}x {item.name}
                                    </span>
                                    <span className="text-white font-mono">
                                        RM {((item.promo_price || item.web_price) * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-rudark-grey my-4 pt-4 space-y-2">
                            <div className="flex justify-between items-center text-gray-400 text-sm">
                                <span>Subtotal</span>
                                <span className="font-mono">RM {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400 text-sm">
                                <span>Shipping ({shippingZone})</span>
                                <span className="font-mono">RM {shippingCost.toFixed(2)}</span>
                            </div>

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
                                        onClick={handleApplyPromo}
                                        disabled={!promoCode || promoStatus === 'success'}
                                        className="bg-white text-black px-4 py-2 font-bold font-condensed uppercase hover:bg-rudark-volt transition-colors disabled:opacity-50 text-sm rounded-sm"
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

                    {/* Details Form */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey/50">
                        <h2 className="text-xl font-condensed font-bold mb-6 uppercase text-gray-200">Logistics Data</h2>

                        {errorMessage && (
                            <div className="bg-red-900/30 border border-red-500 text-red-100 p-4 mb-6 text-sm font-mono">
                                [ERROR]: {errorMessage}
                            </div>
                        )}

                        <form action={onSubmit} className="space-y-5">
                            <input type="hidden" name="cart" value={JSON.stringify(cart)} />
                            <input type="hidden" name="appliedDiscount" value={appliedDiscount.toFixed(2)} /> {/* Hidden input for discount */}

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Full Name</label>
                                <input name="name" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="OPERATIVE NAME" />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Comms Contact</label>
                                <input name="phone" type="tel" required className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="+60 12-345 6789" />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Dropzone Address</label>
                                <textarea name="address" required rows={3} className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors" placeholder="FULL SHIPPING ADDRESS"></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-1 uppercase">Region Select</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShippingZone('Peninsular')}
                                        className={`p-4 border rounded-sm text-sm font-bold uppercase transition-all ${shippingZone === 'Peninsular'
                                            ? 'bg-rudark-volt text-black border-rudark-volt'
                                            : 'bg-transparent text-gray-400 border-rudark-grey hover:border-gray-300'
                                            }`}
                                    >
                                        Peninsular<br />(RM 10)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShippingZone('Sabah/Sarawak')}
                                        className={`p-4 border rounded-sm text-sm font-bold uppercase transition-all ${shippingZone === 'Sabah/Sarawak'
                                            ? 'bg-rudark-volt text-black border-rudark-volt'
                                            : 'bg-transparent text-gray-400 border-rudark-grey hover:border-gray-300'
                                            }`}
                                    >
                                        East MY<br />(RM 20)
                                    </button>
                                    <input type="hidden" name="state" value={shippingZone} />
                                </div>
                            </div>

                            <div className="pt-6">
                                <SubmitButton />
                            </div>

                            <p className="text-[10px] text-gray-500 text-center font-mono uppercase tracking-widest mt-4">
                                Encrypted Transaction via BizApp Pay
                            </p>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
