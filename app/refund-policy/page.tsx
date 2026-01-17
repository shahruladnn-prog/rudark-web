import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

export const metadata = {
    title: "Refund Policy | Rud'Ark Pro Shop",
    description: "Learn about our refund and return policies.",
};

export default function RefundPolicyPage() {
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
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase">Legal</span>
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold uppercase mt-2">Refund Policy</h1>
                    <p className="text-gray-400 mt-4 text-sm">Last updated: January 2025</p>
                </div>

                {/* Content */}
                <div className="space-y-10">

                    {/* Overview */}
                    <section>
                        <p className="text-gray-300 leading-relaxed">
                            At Rud'Ark, we stand behind the quality of our products. We understand that sometimes things don't work out, and we're here to help. Please read our refund policy carefully to understand your rights and our procedures.
                        </p>
                    </section>

                    {/* Eligibility */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Refund Timeframe</h2>
                        </div>
                        <p className="text-gray-300 mb-4">
                            You have <strong className="text-rudark-volt">7 calendar days</strong> from the date of delivery to request a refund.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Request must be submitted within 7 days of receiving your order</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Contact us via email at <a href="mailto:hello@rudark.my" className="text-rudark-volt hover:underline">hello@rudark.my</a></span>
                            </li>
                        </ul>
                    </section>

                    {/* Conditions */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Refund Conditions</h2>
                        </div>
                        <p className="text-gray-300 mb-4">
                            To be eligible for a refund, items must meet the following criteria:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span><strong className="text-white">Unused</strong> — Item must not have been used, worn, or washed</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span><strong className="text-white">With Tags</strong> — All original tags and labels must be attached</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span><strong className="text-white">Original Packaging</strong> — Item must be in original packaging</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                <span><strong className="text-white">Undamaged</strong> — Item must not be damaged due to customer handling</span>
                            </li>
                        </ul>
                    </section>

                    {/* Non-Refundable */}
                    <section className="bg-red-900/10 border border-red-900/30 rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <XCircle className="text-red-500" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase text-red-400">Non-Refundable Items</h2>
                        </div>
                        <p className="text-gray-300 mb-4">
                            The following items are <strong className="text-red-400">NOT eligible</strong> for refund:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <span>Sale, clearance, or promotional items</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <span>Items damaged due to personal misuse or negligence</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <span>Custom or personalized products</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <span>Items returned without original packaging or tags</span>
                            </li>
                        </ul>
                    </section>

                    {/* Product-Specific */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-yellow-500" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Product-Specific Policies</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Due to the nature and size of certain products (e.g., water rafting boats, large equipment), specific return conditions may apply. Please contact us directly for clarification on any product-specific policies before making a purchase.
                        </p>
                    </section>

                    {/* Return Shipping */}
                    <section>
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4 border-b border-rudark-grey pb-2">Return Shipping</h2>
                        <ul className="space-y-3 text-gray-300 text-sm">
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Return shipping costs are the responsibility of the <strong className="text-white">customer</strong></span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Items must be shipped back using a trackable shipping method</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Refund approval is <strong className="text-white">subject to receiving and inspection</strong> of the returned item</span>
                            </li>
                        </ul>
                    </section>

                    {/* Refund Method */}
                    <section>
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4 border-b border-rudark-grey pb-2">Refund Method</h2>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Once your return is received and inspected, we will notify you of the approval or rejection of your refund. If approved, your refund will be processed via <strong className="text-rudark-volt">bank transfer</strong> within 7-14 business days.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-rudark-volt/10 border border-rudark-volt/30 rounded-sm p-6 md:p-8 text-center">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-3">Need Help?</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            If you have questions about our refund policy, please contact us:
                        </p>
                        <a
                            href="mailto:hello@rudark.my"
                            className="inline-block bg-rudark-volt text-black font-bold px-6 py-3 rounded-sm hover:bg-white transition-colors uppercase tracking-wider text-sm"
                        >
                            Contact Support
                        </a>
                    </section>

                </div>
            </div>
        </div>
    );
}
