'use client';

import { useState } from 'react';
import { subscribeEmail } from '@/actions/subscriber-actions';
import { useToast } from '@/components/ui/toast';
import { Mail, CheckCircle, Copy } from 'lucide-react';

export default function NewsletterForm({ source = 'general' }: { source?: string }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [promoCode, setPromoCode] = useState<string | null>(null);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        const result = await subscribeEmail(email, source);
        setLoading(false);

        if (result.success) {
            setPromoCode(result.code || null);
            showToast('success', result.message || 'Subscribed successfully!');
        } else {
            showToast('error', result.error || 'Something went wrong');
        }
    };

    const copyToClipboard = () => {
        if (promoCode) {
            navigator.clipboard.writeText(promoCode);
            showToast('success', 'Code copied to clipboard!');
        }
    };

    if (promoCode) {
        return (
            <div className="bg-rudark-carbon border border-rudark-volt/30 p-8 text-center rounded-sm max-w-2xl mx-auto my-12">
                <CheckCircle className="text-rudark-volt mx-auto mb-4" size={48} />
                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2 italic">You're in the inner circle</h3>
                <p className="text-gray-400 mb-6">Use this code at checkout for 10% off your next order:</p>
                <div 
                    onClick={copyToClipboard}
                    className="flex items-center justify-between bg-black border border-rudark-volt p-4 cursor-pointer hover:bg-white/5 transition-colors group"
                >
                    <span className="text-3xl font-mono font-bold text-rudark-volt tracking-widest">{promoCode}</span>
                    <Copy size={20} className="text-gray-500 group-hover:text-white" />
                </div>
                <p className="text-[10px] text-gray-600 mt-4 uppercase font-bold tracking-widest">Click code to copy</p>
            </div>
        );
    }

    return (
        <div className="bg-rudark-carbon border border-rudark-grey/20 p-8 md:p-12 rounded-sm max-w-4xl mx-auto my-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white uppercase tracking-tighter italic leading-none mb-4">
                        Join the <span className="text-rudark-volt">Elite</span>
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Get early access to drops, exclusive technical insights, and 10% off your first order. 
                        No fluff, just high-performance updates.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="email"
                            placeholder="OPERATOR@EMAIL.COM"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-black border border-rudark-grey/40 text-white pl-12 pr-4 py-4 focus:border-rudark-volt focus:outline-none font-mono text-sm tracking-wider placeholder:text-gray-700 transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-rudark-volt text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 italic"
                    >
                        {loading ? 'Processing...' : 'Get 10% Off'}
                    </button>
                    <p className="text-[9px] text-gray-600 text-center uppercase font-bold tracking-widest">
                        Secure Transmission. We respect your privacy.
                    </p>
                </form>
            </div>
        </div>
    );
}
