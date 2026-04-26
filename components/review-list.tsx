import { getApprovedReviews } from '@/actions/review-actions';
import { Star } from 'lucide-react';

export default async function ReviewList({ productSku }: { productSku: string }) {
    const reviews = await getApprovedReviews(productSku);

    if (reviews.length === 0) {
        return (
            <div className="py-12 text-center border-t border-rudark-grey/20">
                <p className="text-gray-500 font-condensed uppercase tracking-wider">No reviews yet. Be the first to share your experience.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-8 border-t border-rudark-grey/20">
            <h3 className="text-2xl font-bold text-white uppercase italic tracking-tighter mb-8">
                Customer Reviews <span className="text-rudark-volt">({reviews.length})</span>
            </h3>
            
            <div className="space-y-8">
                {reviews.map((review) => (
                    <div key={review.id} className="border-b border-rudark-grey/10 pb-8 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex gap-0.5 mb-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={14}
                                            fill={review.rating >= star ? 'currentColor' : 'none'}
                                            className={review.rating >= star ? 'text-rudark-volt' : 'text-gray-600'}
                                        />
                                    ))}
                                </div>
                                <p className="font-bold text-white uppercase text-sm">{review.customer_name}</p>
                            </div>
                            <time className="text-xs font-mono text-gray-500 uppercase">
                                {new Date(review.created_at).toLocaleDateString()}
                            </time>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{review.body}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
