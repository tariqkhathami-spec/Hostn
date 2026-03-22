'use client';

import { ShieldCheck, Star, Headphones, CreditCard } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function WhyHostn() {
  const { t } = useLanguage();

  const features = [
    {
      Icon: ShieldCheck,
      title: t('why.verified'),
      description: t('why.verifiedDesc'),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      Icon: Star,
      title: t('why.reviews'),
      description: t('why.reviewsDesc'),
      color: 'bg-amber-50 text-amber-600',
    },
    {
      Icon: Headphones,
      title: t('why.support'),
      description: t('why.supportDesc'),
      color: 'bg-green-50 text-green-600',
    },
    {
      Icon: CreditCard,
      title: t('why.payments'),
      description: t('why.paymentsDesc'),
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <section className="py-10 sm:py-16">
      <div className="container-custom">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="section-title mb-2 sm:mb-3">{t('why.title')}</h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm sm:text-base">
            {t('why.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {features.map(({ Icon, title, description, color }) => (
            <div
              key={title}
              className="card p-4 sm:p-6 hover:-translate-y-1 transition-transform duration-300 group"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-5 ${color} group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
