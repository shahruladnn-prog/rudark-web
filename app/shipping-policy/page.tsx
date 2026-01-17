import Link from 'next/link';
import { ArrowLeft, Truck, Clock, Globe, Package, AlertTriangle, RotateCcw } from 'lucide-react';

export const metadata = {
    title: "Shipping & Returns | Rud'Ark Pro Shop",
    description: "Learn about our shipping methods, delivery times, and return process.",
};

export default function ShippingPolicyPage() {
    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-28 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-4xl mx-auto">

                {/* Back Button */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-mono uppercase">Back</span>
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase">Delivery</span>
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold uppercase mt-2">Shipping & Returns</h1>
                    <p className="text-gray-400 mt-4 text-sm">Last updated: January 2025</p>
                </div>

                {/* Content */}
                <div className="space-y-10">

                    {/* Processing Time */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Order Processing</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            Orders are typically processed within <strong className="text-rudark-volt">1-3 business days</strong> after payment confirmation. You will receive a tracking number via email once your order has been shipped.
                        </p>
                        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-sm p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
                                <p className="text-yellow-200/80 text-sm">
                                    Processing time may vary depending on product type and size. Large items such as water rafting boats may require additional preparation time.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Domestic Shipping */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Truck className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Domestic Shipping (Malaysia)</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50">
                                <h3 className="text-white font-bold mb-2">Peninsular Malaysia</h3>
                                <p className="text-gray-400 text-sm">Standard: 2-5 business days</p>
                                <p className="text-gray-400 text-sm">Express: 1-3 business days</p>
                            </div>
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50">
                                <h3 className="text-white font-bold mb-2">Sabah & Sarawak</h3>
                                <p className="text-gray-400 text-sm">Standard: 5-10 business days</p>
                                <p className="text-gray-400 text-sm">Express: 3-5 business days</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-4 italic">
                            * Delivery times are estimates and may vary due to external factors such as weather, holidays, or courier delays.
                        </p>
                    </section>

                    {/* East Malaysia Notice */}
                    <section className="bg-yellow-900/20 border border-yellow-700/30 rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Package className="text-yellow-500" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase text-yellow-200">East Malaysia (Sabah & Sarawak)</h2>
                        </div>
                        <p className="text-yellow-200/80 text-sm leading-relaxed">
                            For large items shipped to Sabah and Sarawak via sea freight, additional time is required for documentation, customs clearance, and duty processing. Please allow <strong className="text-white">2-4 weeks</strong> for these shipments. Our team will contact you with specific timelines based on your order.
                        </p>
                    </section>

                    {/* International Shipping */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">International Shipping</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            International shipping is available on a <strong className="text-rudark-volt">case-by-case basis</strong>, subject to:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Product availability for international shipping</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Destination country regulations and restrictions</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Shipping cost calculation based on weight and destination</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Import duties and taxes (customer responsibility)</span>
                            </li>
                        </ul>
                        <p className="text-gray-400 text-sm mt-4">
                            For international orders, please contact us at <a href="mailto:hello@rudark.my" className="text-rudark-volt hover:underline">hello@rudark.my</a> for a quote.
                        </p>
                    </section>

                    {/* Returns Section */}
                    <section className="border-t border-rudark-grey pt-10">
                        <div className="flex items-center gap-3 mb-6">
                            <RotateCcw className="text-rudark-volt" size={24} />
                            <h2 className="text-2xl font-condensed font-bold uppercase">Returns</h2>
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-6">
                            We want you to be completely satisfied with your purchase. If you're not happy with your order, you may return eligible items within <strong className="text-rudark-volt">7 days</strong> of delivery.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-5">
                                <h3 className="text-white font-bold mb-3 uppercase text-sm">Return Requirements</h3>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Item must be unused and unworn</li>
                                    <li>• Original tags must be attached</li>
                                    <li>• Original packaging required</li>
                                    <li>• Item must be undamaged</li>
                                </ul>
                            </div>
                            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-5">
                                <h3 className="text-white font-bold mb-3 uppercase text-sm">Return Shipping</h3>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Return shipping paid by customer</li>
                                    <li>• Use trackable shipping method</li>
                                    <li>• Pack items securely</li>
                                    <li>• Include order number in package</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mt-6">
                            For complete return policy details, please see our <Link href="/refund-policy" className="text-rudark-volt hover:underline">Refund Policy</Link>.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-rudark-volt/10 border border-rudark-volt/30 rounded-sm p-6 md:p-8 text-center">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-3">Questions About Shipping?</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Our team is ready to assist with any shipping inquiries.
                        </p>
                        <a
                            href="mailto:hello@rudark.my"
                            className="inline-block bg-rudark-volt text-black font-bold px-6 py-3 rounded-sm hover:bg-white transition-colors uppercase tracking-wider text-sm"
                        >
                            Contact Us
                        </a>
                    </section>

                </div>
            </div>
        </div>
    );
}
