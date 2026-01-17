'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Phone, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormStatus('sending');

        // Simulate form submission - in production, connect to your email service
        setTimeout(() => {
            setFormStatus('success');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-28 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-6xl mx-auto">

                {/* Back Button */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-mono uppercase">Back</span>
                </Link>

                {/* Header */}
                <div className="mb-12 text-center">
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase">Get In Touch</span>
                    <h1 className="text-4xl md:text-7xl font-condensed font-bold uppercase mt-2">Contact Us</h1>
                    <p className="text-gray-400 mt-4 max-w-xl mx-auto">
                        Have questions about our gear, need support with an order, or want to collaborate? We're here to help.
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid md:grid-cols-2 gap-8 md:gap-12">

                    {/* Left: Contact Info */}
                    <div className="space-y-6">

                        {/* Company Card */}
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8">
                            {/* Dual Logos */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-rudark-grey/50">
                                <Image
                                    src="/logo.png"
                                    alt="Rud'Ark"
                                    width={50}
                                    height={50}
                                    className="object-contain"
                                />
                                <div className="w-px h-10 bg-rudark-grey" />
                                <Image
                                    src="/GGPR white LOGO-01.png"
                                    alt="GGP Resources Sdn Bhd"
                                    width={120}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>

                            <h2 className="text-xl font-condensed font-bold uppercase mb-1 text-white">GGP Resources Sdn Bhd</h2>
                            <p className="text-rudark-volt text-sm font-mono mb-6">Official distributor of Rud'Ark</p>

                            {/* Contact Details */}
                            <div className="space-y-5">
                                <a
                                    href="mailto:hello@rudark.my"
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-rudark-matte border border-rudark-grey rounded-sm flex items-center justify-center group-hover:border-rudark-volt transition-colors">
                                        <Mail className="text-rudark-volt" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                                        <p className="text-white font-mono group-hover:text-rudark-volt transition-colors">hello@rudark.my</p>
                                    </div>
                                </a>

                                <a
                                    href="tel:+60135518857"
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-rudark-matte border border-rudark-grey rounded-sm flex items-center justify-center group-hover:border-rudark-volt transition-colors">
                                        <Phone className="text-rudark-volt" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Phone / WhatsApp</p>
                                        <p className="text-white font-mono group-hover:text-rudark-volt transition-colors">+60 13-551 8857</p>
                                    </div>
                                </a>

                                <a
                                    href="https://maps.app.goo.gl/QetxHvtzAeTXEPPn7"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-rudark-matte border border-rudark-grey rounded-sm flex items-center justify-center group-hover:border-rudark-volt transition-colors flex-shrink-0">
                                        <MapPin className="text-rudark-volt" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                                        <p className="text-white group-hover:text-rudark-volt transition-colors leading-relaxed">
                                            Lot 10846, Jalan Besar Kampung Chulek,<br />
                                            31600 Gopeng, Perak, Malaysia
                                        </p>
                                        <p className="text-rudark-volt text-xs mt-1 flex items-center gap-1">
                                            <span>View on Google Maps</span>
                                            <span>→</span>
                                        </p>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Clock className="text-rudark-volt" size={20} />
                                <h3 className="font-condensed font-bold uppercase">Operating Hours</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Monday - Friday</span>
                                    <span className="text-white font-mono">9:00 AM - 6:00 PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Saturday</span>
                                    <span className="text-white font-mono">9:00 AM - 1:00 PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Sunday & Public Holidays</span>
                                    <span className="text-red-400 font-mono">Closed</span>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Quick Contact */}
                        <a
                            href="https://wa.me/60135518857?text=Hi%20Rud'Ark!%20I%20have%20a%20question%20about..."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-green-600 hover:bg-green-500 transition-colors rounded-sm p-4"
                        >
                            <div className="flex items-center justify-center gap-3">
                                <MessageCircle size={24} />
                                <div>
                                    <p className="font-bold uppercase">Chat on WhatsApp</p>
                                    <p className="text-sm text-green-100">Quick response during business hours</p>
                                </div>
                            </div>
                        </a>

                    </div>

                    {/* Right: Contact Form */}
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 md:p-8 h-fit">
                        <h2 className="text-2xl font-condensed font-bold uppercase mb-2">Send Us a Message</h2>
                        <p className="text-gray-400 text-sm mb-6">We'll get back to you within 24-48 hours.</p>

                        {formStatus === 'success' ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Send className="text-green-500" size={32} />
                                </div>
                                <h3 className="text-xl font-condensed font-bold uppercase mb-2">Message Sent!</h3>
                                <p className="text-gray-400 text-sm mb-6">Thank you for reaching out. We'll respond shortly.</p>
                                <button
                                    onClick={() => setFormStatus('idle')}
                                    className="text-rudark-volt hover:text-white transition-colors text-sm uppercase tracking-wider"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Your name"
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="your@email.com"
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Phone (Optional)</label>
                                    <input
                                        type="tel"
                                        placeholder="+60 12-345 6789"
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Subject *</label>
                                    <select
                                        required
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none transition-colors"
                                    >
                                        <option value="">Select a topic...</option>
                                        <option value="order">Order Inquiry</option>
                                        <option value="product">Product Question</option>
                                        <option value="shipping">Shipping & Delivery</option>
                                        <option value="returns">Returns & Refunds</option>
                                        <option value="wholesale">Wholesale / B2B</option>
                                        <option value="sponsorship">Sponsorship & Collaboration</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Message *</label>
                                    <textarea
                                        required
                                        rows={5}
                                        placeholder="How can we help you?"
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={formStatus === 'sending'}
                                    className="w-full bg-rudark-volt text-black font-bold py-4 rounded-sm hover:bg-white transition-colors uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {formStatus === 'sending' ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            <span>Send Message</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                </div>

                {/* Map Embed Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-condensed font-bold uppercase mb-4 text-center">Find Us</h2>
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1989.4!2d101.17698645606896!3d4.430855572047569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc5a5e5a5a5a5a%3A0x5a5a5a5a5a5a5a5a!2sGGP%20Resources!5e0!3m2!1sen!2smy!4v1705000000000!5m2!1sen!2smy"
                            width="100%"
                            height="400"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="grayscale hover:grayscale-0 transition-all duration-500"
                        />
                    </div>
                    <p className="text-center mt-4">
                        <a
                            href="https://maps.app.goo.gl/QetxHvtzAeTXEPPn7"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rudark-volt hover:text-white transition-colors text-sm uppercase tracking-wider inline-flex items-center gap-2"
                        >
                            <MapPin size={16} />
                            Open in Google Maps
                        </a>
                    </p>
                </div>

            </div>
        </div>
    );
}
