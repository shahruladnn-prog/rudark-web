'use client';

import { useState, useEffect } from 'react';
import { getPendingReviews, moderateReview } from '@/actions/review-actions';
import { Review } from '@/types';
import { useToast } from '@/components/ui/toast';
import { Star, Check, X, RefreshCw, MessageSquare } from 'lucide-react';

export default function PendingReviewsPage() {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchReviews = async () => {
        setLoading(true);
        const data = await getPendingReviews();
        setReviews(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
        setActionLoading(id);
        const result = await moderateReview(id, status);
        setActionLoading(null);

        if (result.success) {
            showToast('success', `Review ${status === 'approved' ? 'approved' : 'rejected'}`);
            fetchReviews();
        } else {
            showToast('error', result.error || 'Failed to moderate review');
        }
    };

    return (
        <div className="max-w-7xl pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Pending Reviews</h1>
                    <p className="text-sm text-gray-400">Moderate customer reviews before they go live</p>
                </div>
                <button 
                    onClick={fetchReviews}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {loading ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-4" />
                    <p>Loading pending reviews...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
                    <MessageSquare size={24} className="mx-auto mb-4 opacity-20" />
                    <p>No pending reviews to moderate.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                                <div className="flex-1 min-w-[280px]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={14}
                                                    fill={review.rating >= star ? '#f59e0b' : 'none'}
                                                    className={review.rating >= star ? 'text-amber-500' : 'text-gray-300'}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                            SKU: {review.product_sku}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <p className="font-bold text-gray-900">{review.customer_name}</p>
                                        <p className="text-xs text-gray-500">{review.customer_email}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 border-l-2 border-gray-200 text-sm text-gray-700 italic">
                                        "{review.body}"
                                    </div>
                                    <p className="mt-2 text-[10px] font-mono text-gray-400 uppercase">
                                        Submitted on {new Date(review.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleModerate(review.id!, 'approved')}
                                        disabled={actionLoading === review.id}
                                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                        <Check size={16} /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleModerate(review.id!, 'rejected')}
                                        disabled={actionLoading === review.id}
                                        className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
