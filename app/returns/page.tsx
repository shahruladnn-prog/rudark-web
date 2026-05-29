import Link from 'next/link';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Phone, Mail, Clock, Package } from 'lucide-react';

export const metadata = {
    title: "Returns & Exchanges | Rud'Ark Pro Shop",
    description: "Rud'Ark 7-day return policy, eligibility conditions, and how to initiate a return.",
};

export default function ReturnsPage() {
    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-28 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-4xl mx-auto">

                {/* Back Button */}
                <Link
                    href="/shop"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-mono uppercase">Back to Shop</span>
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase">Satisfaction Guarantee</span>
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold uppercase mt-2">Returns & Exchanges</h1>
                    <p className="text-gray-400 mt-4 text-sm">Last updated: January 2025</p>
                </div>

                <div className="space-y-10">

                    {/* Overview */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <RotateCcw className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Return Policy Overview</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            We want you to love your gear. If something isn't right, you may return eligible items within <strong className="text-rudark-volt">7 days of delivery</strong>. Returns are accepted for unused items in their original condition.
                        </p>
                        <div className="flex items-center gap-3 bg-rudark-matte border border-rudark-grey/50 rounded-sm p-4">
                            <Clock className="text-rudark-volt flex-shrink-0" size={20} />
                            <div>
                                <p className="text-white font-bold text-sm uppercase">7-Day Return Window</p>
                                <p className="text-gray-400 text-xs mt-0.5">Return requests must be initiated within 7 days of the delivery date as confirmed by the tracking record.</p>
                            </div>
                        </div>
                    </section>

                    {/* Conditions */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-6">Return Eligibility</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-rudark-matte border border-green-900/40 rounded-sm p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                                    <h3 className="text-white font-bold uppercase text-sm">Eligible for Return</h3>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Item is unused and unworn</li>
                                    <li>• Original tags are still attached</li>
                                    <li>• Original packaging is intact</li>
                                    <li>• Item is undamaged and unaltered</li>
                                    <li>• Return requested within 7 days of delivery</li>
                                    <li>• Full-price items (not sale/discounted)</li>
                                </ul>
                            </div>
                            <div className="bg-rudark-matte border border-red-900/40 rounded-sm p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <XCircle size={18} className="text-red-500 flex-shrink-0" />
                                    <h3 className="text-white font-bold uppercase text-sm">Not Eligible for Return</h3>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Sale or discounted items (final sale)</li>
                                    <li>• Custom or personalized products</li>
                                    <li>• Items showing signs of use or wear</li>
                                    <li>• Items with missing or damaged packaging</li>
                                    <li>• Tags removed or tampered with</li>
                                    <li>• Items returned after the 7-day window</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-4 italic">
                            * Large watercraft (rafts, kayaks) may have special return conditions. Contact us before initiating a return for these items.
                        </p>
                    </section>

                    {/* How to Return */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Package className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">How to Initiate a Return</h2>
                        </div>
                        <ol className="space-y-6">
                            {[
                                {
                                    step: '01',
                                    title: 'Contact Us Within 7 Days',
                                    desc: 'Email hello@rudark.my or WhatsApp +60 13-551 8857 with your order number and the reason for your return. Do not ship items without prior approval.'
                                },
                                {
                                    step: '02',
                                    title: 'Receive Return Approval',
                                    desc: 'Our team will review your request within 2 business days and send you a return authorisation and the return shipping address.'
                                },
                                {
                                    step: '03',
                                    title: 'Pack and Ship',
                                    desc: 'Securely repack the item in its original packaging. Include your order number inside the package. Use a trackable shipping service — return shipping costs are the customer\'s responsibility.'
                                },
                                {
                                    step: '04',
                                    title: 'Refund Processed',
                                    desc: 'Once we receive and inspect the item (typically within 3 business days), your refund will be processed via bank transfer within 7–14 business days.'
                                }
                            ].map(({ step, title, desc }) => (
                                <li key={step} className="flex gap-4">
                                    <span className="text-3xl font-condensed font-bold text-rudark-volt/30 leading-none flex-shrink-0 w-10">{step}</span>
                                    <div>
                                        <h3 className="text-white font-bold uppercase text-sm mb-1">{title}</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    {/* Refund Details */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4">Refund Details</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-2xl font-condensed font-bold text-rudark-volt">7–14</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Business Days for Refund</p>
                            </div>
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-sm font-condensed font-bold text-white uppercase">Bank Transfer</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Refund Method</p>
                            </div>
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-sm font-condensed font-bold text-white uppercase">Customer Pays</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Return Shipping Cost</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-4">
                            Original shipping charges are non-refundable. Refunds will be issued to the bank account you provide upon approval.
                            For full refund policy details, see our <Link href="/refund-policy" className="text-rudark-volt hover:underline">Refund Policy</Link>.
                        </p>
                    </section>

                    {/* Contact CTA */}
                    <section className="bg-rudark-volt/10 border border-rudark-volt/30 rounded-sm p-6 md:p-8">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-3">Questions About a Return?</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Our team is available Monday–Friday 9am–6pm and Saturday 9am–1pm (MYT).
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <a
                                href="mailto:hello@rudark.my"
                                className="flex items-center gap-2 bg-rudark-volt text-black font-bold px-5 py-3 rounded-sm hover:bg-white transition-colors uppercase tracking-wider text-sm"
                            >
                                <Mail size={16} /> Email Support
                            </a>
                            <a
                                href="https://wa.me/60135518857"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 border border-rudark-grey text-white font-bold px-5 py-3 rounded-sm hover:border-rudark-volt hover:text-rudark-volt transition-all uppercase tracking-wider text-sm"
                            >
                                <Phone size={16} /> WhatsApp Us
                            </a>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
