'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Review } from '@/types';
import { reviewsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import { Star, MessageSquare } from 'lucide-react';

interface ReviewsListProps {
  propertyId: string;
  averageRating: number;
  reviewCount: number;
}

export default function ReviewsList({ propertyId, averageRating, reviewCount }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [propertyId, page]);

  const fetchReviews = async () => {
    try {
      const res = await reviewsApi.getPropertyReviews(propertyId, { page, limit: 5 });
      const data = res.data.data;
      if (page === 1) {
        setReviews(data);
      } else {
        setReviews((prev) => [...prev, ...data]);
      }
      setHasMore(page < res.data.pagination.pages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-2xl">
          <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
          <div>
            <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <div className="text-sm text-gray-500">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {(review.guest as any)?.avatar ? (
                    <Image
                      src={(review.guest as any).avatar}
                      alt={(review.guest as any).name}
                      width={40}
                      height={40}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <span className="text-primary-600 font-semibold text-sm">
                      {(review.guest as any)?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">{(review.guest as any)?.name}</p>
                    <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                  </div>
                  <StarRating rating={review.ratings.overall} showCount={false} className="mt-0.5" />
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

              {/* Host response */}
              {review.hostResponse?.comment && (
                <div className="mt-3 ml-4 p-3 bg-gray-50 rounded-xl border-l-4 border-primary-300">
                  <p className="text-xs font-semibold text-primary-600 mb-1">Host Response</p>
                  <p className="text-sm text-gray-600">{review.hostResponse.comment}</p>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-primary-200"
            >
              Load more reviews
            </button>
          )}
        </div>
      )}
    </div>
  );
}
