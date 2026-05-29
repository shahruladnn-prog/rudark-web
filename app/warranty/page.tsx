import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle, XCircle, Phone, Mail, AlertTriangle, Clock } from 'lucide-react';

export const metadata = {
    title: "Warranty | Rud'Ark Pro Shop",
    description: "Rud'Ark warranty coverage, claim process, and terms for all products.",
};

export default function WarrantyPage() {
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
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase">Product Assurance</span>
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold uppercase mt-2">Warranty</h1>
                    <p className="text-gray-400 mt-4 text-sm">Last updated: January 2025</p>
                </div>

                <div className="space-y-10">

                    {/* Coverage Overview */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Warranty Coverage</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed mb-6">
                            Rud'Ark products are backed by a <strong className="text-rudark-volt">12-month warranty</strong> from the date of purchase against manufacturing defects in materials and workmanship. This warranty applies to the original purchaser and is non-transferable.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-rudark-matte border border-green-900/40 rounded-sm p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                                    <h3 className="text-white font-bold uppercase text-sm">What Is Covered</h3>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Manufacturing defects in materials</li>
                                    <li>• Structural failures under normal use</li>
                                    <li>• Zipper and buckle hardware defects</li>
                                    <li>• Seam and stitching failures</li>
                                    <li>• Coating or laminate delamination</li>
                                    <li>• Component failures from production faults</li>
                                </ul>
                            </div>
                            <div className="bg-rudark-matte border border-red-900/40 rounded-sm p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <XCircle size={18} className="text-red-500 flex-shrink-0" />
                                    <h3 className="text-white font-bold uppercase text-sm">What Is Not Covered</h3>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-400">
                                    <li>• Normal wear and tear</li>
                                    <li>• Accidental damage or improper use</li>
                                    <li>• Damage from neglect or inadequate care</li>
                                    <li>• Unauthorized repairs or modifications</li>
                                    <li>• Cosmetic damage (scratches, discolouration)</li>
                                    <li>• Products without proof of purchase</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Duration */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Warranty Period</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-3xl font-condensed font-bold text-rudark-volt">12</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Months — Apparel & Accessories</p>
                            </div>
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-3xl font-condensed font-bold text-rudark-volt">12</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Months — Gear & Safety Equipment</p>
                            </div>
                            <div className="bg-rudark-matte p-4 rounded-sm border border-rudark-grey/50 text-center">
                                <p className="text-3xl font-condensed font-bold text-rudark-volt">12</p>
                                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Months — Watercraft & Hardware</p>
                            </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-4 italic">* Warranty period begins from the date of original purchase as stated on your receipt or order confirmation.</p>
                    </section>

                    {/* How to Claim */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">How to Make a Warranty Claim</h2>
                        </div>
                        <ol className="space-y-6">
                            {[
                                {
                                    step: '01',
                                    title: 'Contact Our Team',
                                    desc: 'Email us at hello@rudark.my with your order number and a brief description of the defect. Include your full name and contact number.'
                                },
                                {
                                    step: '02',
                                    title: 'Provide Documentation',
                                    desc: 'Attach clear photos or a short video showing the defect. Include your proof of purchase (order confirmation email or receipt).'
                                },
                                {
                                    step: '03',
                                    title: 'Await Assessment',
                                    desc: 'Our team will review your claim within 3–5 business days and advise on the next steps — repair, replacement, or refund at our discretion.'
                                },
                                {
                                    step: '04',
                                    title: 'Ship the Item (if required)',
                                    desc: 'If a physical inspection is needed, we will provide a return address. Return shipping costs are covered by Rud\'Ark for valid warranty claims.'
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

                    {/* What to Include */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4">What to Include in Your Claim Email</h2>
                        <ul className="grid md:grid-cols-2 gap-3">
                            {[
                                'Full name and contact number',
                                'Order number (e.g., RD-XXXXX)',
                                'Product name and SKU',
                                'Date of purchase',
                                'Description of the defect',
                                'Photos or video of the issue',
                                'Proof of purchase (receipt / order email)',
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                                    <CheckCircle size={14} className="text-rudark-volt mt-0.5 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Contact CTA */}
                    <section className="bg-rudark-volt/10 border border-rudark-volt/30 rounded-sm p-6 md:p-8">
                        <h2 className="text-xl font-condensed font-bold uppercase mb-3">Need Help?</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Our support team is available Monday–Friday, 9am–6pm and Saturday 9am–1pm.
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
