'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi } from '@/lib/api';
import { Star, Loader2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Review {
  _id: string;
  guest?: { name: string };
  property?: { title: string };
  rating: number;
  comment: string;
  createdAt: string;
}

const t: Record<string, Record<string, string>> = {
  title: { en: 'Reviews', ar: '\u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a' },
  noReviews: { en: 'No reviews yet', ar: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0628\u0639\u062f' },
  by: { en: 'by', ar: '\u0628\u0648\u0627\u0633\u0637\u0629' },
  on: { en: 'on', ar: '\u0639\u0644\u0649' },
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function HostReviewsPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const res = await hostApi.getReviews();
      setReviews(res.data.data || res.data || []);
    } catch {
      toast.error(lang === 'ar' ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a' : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">{t.noReviews[lang]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">{review.guest?.name || '-'}</span>
                    <StarDisplay rating={review.rating} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {t.on[lang]}{' '}
                    <span className="text-primary-600 font-medium">{review.property?.title || '-'}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-US')}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
