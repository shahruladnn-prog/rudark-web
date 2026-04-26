'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview } from '@/actions/review-actions';
import { useToast } from '@/components/ui/toast';

export default function ReviewForm({ productSku }: { productSku: string }) {
    const { showToast } = useToast();
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const result = await submitReview({
            product_sku: productSku,
            customer_name: name,
            customer_email: email,
            rating,
            body
        });

        setSubmitting(false);
        if (result.success) {
            setSubmitted(true);
            showToast('success', 'Review submitted for approval');
        } else {
            showToast('error', result.error || 'Failed to submit review');
        }
    };

    if (submitted) {
        return (
            <div className="bg-rudark-carbon border border-rudark-volt/30 p-6 rounded-sm text-center">
                <h3 className="text-xl font-bold text-white uppercase mb-2">Review Submitted</h3>
                <p className="text-gray-400 text-sm">Thank you! Your review has been submitted for approval and will appear once moderated.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-rudark-carbon border border-rudark-grey/30 p-6 rounded-sm space-y-6">
            <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Write a Review</h3>
            
            {/* Star Picker */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-rudark-volt transition-transform hover:scale-110"
                        >
                            <Star
                                size={24}
                                fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
                                className={(hoverRating || rating) >= star ? 'text-rudark-volt' : 'text-gray-600'}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-black border border-rudark-grey/50 text-white px-4 py-2 focus:border-rudark-volt focus:outline-none text-sm"
                        placeholder="John Doe"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black border border-rudark-grey/50 text-white px-4 py-2 focus:border-rudark-volt focus:outline-none text-sm"
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Your Review</label>
                <textarea
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    className="w-full bg-black border border-rudark-grey/50 text-white px-4 py-2 focus:border-rudark-volt focus:outline-none text-sm"
                    placeholder="Tell us about your experience..."
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rudark-volt text-black font-black uppercase py-3 tracking-widest hover:bg-white transition-colors disabled:opacity-50 italic"
            >
                {submitting ? 'Submitting...' : 'Post Review'}
            </button>
        </form>
    );
}
