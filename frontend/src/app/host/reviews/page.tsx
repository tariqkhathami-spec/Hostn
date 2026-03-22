'use client';

import { useEffect, useState, useMemo } from 'react';
import { hostApi, reviewsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  User,
  Building2,
  ChevronDown,
  Send,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ReviewsSkeleton } from '@/components/ui/PageSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';

interface ReviewItem {
  _id: string;
  rating: number;
  comment: string;
  cleanliness?: number;
  accuracy?: number;
  location?: number;
  value?: number;
  communication?: number;
  guest?: { _id: string; name: string; avatar?: string };
  property?: { _id: string; title: string };
  hostResponse?: { comment: string; createdAt: string };
  createdAt: string;
}

interface ReviewsResponse {
  reviews: ReviewItem[];
  total: number;
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
    subRatingAverages: {
      cleanliness: number;
      accuracy: number;
      location: number;
      value: number;
      communication: number;
    };
  };
}

type RatingFilter = 'all' | '9-10' | '7-8' | '5-6' | '1-4';
type ResponseFilter = 'all' | 'responded' | 'unresponded';

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReviews();
  }, [page, sortBy]);

  const loadReviews = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await hostApi.getHostReviews({ page, sort: sortBy, limit: 20 });
      setData(res.data.data);
    } catch {
      setError(true);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      await reviewsApi.respond(reviewId, responseText.trim());
      toast.success('Response posted');
      setRespondingTo(null);
      setResponseText('');
      loadReviews();
    } catch {
      toast.error('Failed to post response');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!data?.reviews) return [];
    let list = [...data.reviews];

    // Rating filter
    if (ratingFilter !== 'all') {
      const ranges: Record<string, [number, number]> = {
        '9-10': [9, 10],
        '7-8': [7, 8],
        '5-6': [5, 6],
        '1-4': [1, 4],
      };
      const [min, max] = ranges[ratingFilter];
      list = list.filter((r) => r.rating >= min && r.rating <= max);
    }

    // Response filter
    if (responseFilter === 'responded') {
      list = list.filter((r) => r.hostResponse);
    } else if (responseFilter === 'unresponded') {
      list = list.filter((r) => !r.hostResponse);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.comment.toLowerCase().includes(q) ||
          r.guest?.name?.toLowerCase().includes(q) ||
          r.property?.title?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data, ratingFilter, responseFilter, searchQuery]);

  // Stats
  const responseRate = useMemo(() => {
    if (!data?.reviews || data.reviews.length === 0) return 0;
    const responded = data.reviews.filter((r) => r.hostResponse).length;
    return Math.round((responded / data.reviews.length) * 100);
  }, [data]);

  const unrespondedCount = data?.reviews?.filter((r) => !r.hostResponse).length || 0;

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const stars = Math.round(rating / 2);
    const cls = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${cls} ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  const subRatingBar = (label: string, value: number) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );

  if (loading && !data) return <ReviewsSkeleton />;

  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load reviews"
        message="We had trouble fetching your reviews. Please try again."
        onRetry={loadReviews}
      />
    );
  }

  const summary = data?.summary;
  const dist = summary?.ratingDistribution || {};
  const maxDist = Math.max(...Object.values(dist).map(Number), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          Guest feedback across all your properties
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Overall Rating */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-500">Overall Rating</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {(summary?.averageRating || 0).toFixed(1)}
            </p>
            <span className="text-xs text-gray-400">/10</span>
          </div>
          <div className="mt-1">{renderStars(summary?.averageRating || 0)}</div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500">Total Reviews</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {summary?.totalReviews || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">Across all properties</p>
        </div>

        {/* Response Rate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500">Response Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{responseRate}%</p>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                responseRate >= 80 ? 'bg-green-400' : responseRate >= 50 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${responseRate}%` }}
            />
          </div>
        </div>

        {/* Needs Reply */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500">Needs Reply</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{unrespondedCount}</p>
          {unrespondedCount > 0 && (
            <button
              onClick={() => setResponseFilter('unresponded')}
              className="text-xs text-primary-600 font-medium hover:text-primary-700 mt-1"
            >
              View pending →
            </button>
          )}
        </div>
      </div>

      {/* Detailed Summary */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Rating Distribution</h3>
            <div className="space-y-2.5">
              {[10, 8, 6, 4, 2].map((rating) => {
                const count = Number(dist[rating] || 0);
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6 text-right">{rating}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${maxDist > 0 ? (count / maxDist) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Ratings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Category Ratings</h3>
            <div className="space-y-3">
              {summary.subRatingAverages && (
                <>
                  {subRatingBar('Cleanliness', summary.subRatingAverages.cleanliness)}
                  {subRatingBar('Accuracy', summary.subRatingAverages.accuracy)}
                  {subRatingBar('Communication', summary.subRatingAverages.communication)}
                  {subRatingBar('Location', summary.subRatingAverages.location)}
                  {subRatingBar('Value', summary.subRatingAverages.value)}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Rating Filter */}
        <div className="relative">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none"
          >
            <option value="all">All Ratings</option>
            <option value="9-10">9-10 (Excellent)</option>
            <option value="7-8">7-8 (Good)</option>
            <option value="5-6">5-6 (Average)</option>
            <option value="1-4">1-4 (Poor)</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Response Filter */}
        <div className="relative">
          <select
            value={responseFilter}
            onChange={(e) => setResponseFilter(e.target.value as ResponseFilter)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none"
          >
            <option value="all">All Responses</option>
            <option value="responded">Responded</option>
            <option value="unresponded">Needs Reply</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 appearance-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Active filters indicator */}
        {(ratingFilter !== 'all' || responseFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setRatingFilter('all');
              setResponseFilter('all');
              setSearchQuery('');
            }}
            className="text-xs text-primary-600 font-medium hover:text-primary-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Showing {filteredReviews.length} of {data?.reviews?.length || 0} reviews
        </p>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <div
              key={review._id}
              className={`bg-white rounded-2xl shadow-sm border p-6 transition-colors ${
                !review.hostResponse
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {review.guest?.avatar ? (
                    <img
                      src={review.guest.avatar}
                      alt={review.guest.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {review.guest?.name || 'Guest'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {renderStars(review.rating)}
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          review.rating >= 9
                            ? 'bg-green-50 text-green-700'
                            : review.rating >= 7
                            ? 'bg-blue-50 text-blue-700'
                            : review.rating >= 5
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {review.rating}/10
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Building2 className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">
                      {review.property?.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatDate(review.createdAt, 'MMM d, yyyy')}
                  </p>
                  {!review.hostResponse && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      Needs reply
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-700 mt-3 leading-relaxed">
                {review.comment}
              </p>

              {/* Sub-ratings chips */}
              {(review.cleanliness || review.accuracy || review.location || review.value || review.communication) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { label: 'Cleanliness', val: review.cleanliness },
                    { label: 'Accuracy', val: review.accuracy },
                    { label: 'Location', val: review.location },
                    { label: 'Value', val: review.value },
                    { label: 'Communication', val: review.communication },
                  ]
                    .filter((s) => s.val)
                    .map((s) => (
                      <span
                        key={s.label}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                          (s.val || 0) >= 8
                            ? 'bg-green-50 text-green-700'
                            : (s.val || 0) >= 5
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {s.label}: {s.val}/10
                      </span>
                    ))}
                </div>
              )}

              {/* Host response */}
              {review.hostResponse ? (
                <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-primary-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Your Response
                    </p>
                    <p className="text-[10px] text-primary-400">
                      {formatDate(review.hostResponse.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-sm text-primary-800 leading-relaxed">
                    {review.hostResponse.comment}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  {respondingTo === review._id ? (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write a thoughtful response to this guest..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">
                          {responseText.length}/500 characters
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setRespondingTo(null); setResponseText(''); }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(review._id)}
                            isLoading={submitting}
                            disabled={!responseText.trim() || submitting}
                            leftIcon={<Send className="w-3.5 h-3.5" />}
                          >
                            Post Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRespondingTo(review._id);
                        setResponseText('');
                      }}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" /> Respond to review
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <ThumbsUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {data?.reviews && data.reviews.length > 0
                ? 'No reviews match your filters.'
                : 'No reviews yet.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {data?.reviews && data.reviews.length > 0
                ? 'Try adjusting your filters to see more reviews.'
                : 'Reviews will appear here once guests leave feedback.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {Math.ceil(data.total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(data.total / 20)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
