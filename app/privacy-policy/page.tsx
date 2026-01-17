import Link from 'next/link';
import { ArrowLeft, Shield, Database, Cookie, Lock, Mail } from 'lucide-react';

export const metadata = {
    title: "Privacy Policy | Rud'Ark Pro Shop",
    description: "How we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
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
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold uppercase mt-2">Privacy Policy</h1>
                    <p className="text-gray-400 mt-4 text-sm">Last updated: January 2025</p>
                </div>

                {/* Content */}
                <div className="space-y-10">

                    {/* Intro */}
                    <section>
                        <p className="text-gray-300 leading-relaxed">
                            GGP Resources Sdn Bhd ("Rud'Ark", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <strong className="text-rudark-volt">rudark.my</strong> or make a purchase from us.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Information We Collect</h2>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div>
                                <h3 className="text-white font-bold mb-2">Personal Information</h3>
                                <p>When you make a purchase, we collect:</p>
                                <ul className="list-disc list-inside mt-2 text-gray-400 space-y-1">
                                    <li>Name and contact information (email, phone number)</li>
                                    <li>Shipping and billing address</li>
                                    <li>Payment information (processed securely by our payment provider)</li>
                                    <li>Order history and preferences</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-white font-bold mb-2">Automatically Collected Information</h3>
                                <p>When you visit our website, we may automatically collect:</p>
                                <ul className="list-disc list-inside mt-2 text-gray-400 space-y-1">
                                    <li>Browser type and version</li>
                                    <li>Device information</li>
                                    <li>IP address and general location</li>
                                    <li>Pages visited and time spent on site</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* How We Use */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">How We Use Your Information</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-300">
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Process Orders</strong> — Fulfill and ship your purchases</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Customer Support</strong> — Respond to your inquiries and requests</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Improve Our Service</strong> — Analyze usage to enhance user experience</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Marketing</strong> — Send promotional emails (only with your consent)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Legal Compliance</strong> — Meet our legal and regulatory obligations</span>
                            </li>
                        </ul>
                    </section>

                    {/* Cookies */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Cookie className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Cookies & Tracking</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            We use cookies and similar tracking technologies to improve your browsing experience, analyze site traffic, and understand where our visitors are coming from. You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    {/* Third Party Sharing */}
                    <section>
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4 border-b border-rudark-grey pb-2">Third-Party Disclosure</h2>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            We do not sell, trade, or rent your personal information to third parties. We may share your information with:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Payment Processors</strong> — To securely process your transactions</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Shipping Partners</strong> — To deliver your orders</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span><strong className="text-white">Legal Authorities</strong> — When required by law</span>
                            </li>
                        </ul>
                    </section>

                    {/* Data Security */}
                    <section className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Data Security</h2>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All payment transactions are encrypted using SSL technology.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-xl font-condensed font-bold uppercase mb-4 border-b border-rudark-grey pb-2">Your Rights</h2>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            You have the right to:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Access the personal data we hold about you</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Request correction of inaccurate information</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Request deletion of your personal data</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-rudark-volt font-bold">•</span>
                                <span>Opt-out of marketing communications at any time</span>
                            </li>
                        </ul>
                    </section>

                    {/* Contact */}
                    <section className="bg-rudark-volt/10 border border-rudark-volt/30 rounded-sm p-6 md:p-8 text-center">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <Mail className="text-rudark-volt" size={24} />
                            <h2 className="text-xl font-condensed font-bold uppercase">Contact Us</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            For privacy-related inquiries, please contact:
                        </p>
                        <div className="text-sm text-gray-300 space-y-1">
                            <p><strong className="text-white">GGP Resources Sdn Bhd</strong></p>
                            <p>Lot 10846, Jalan Besar Kampung Chulek, 31600 Gopeng, Perak</p>
                            <p className="text-rudark-volt">hello@rudark.my</p>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
