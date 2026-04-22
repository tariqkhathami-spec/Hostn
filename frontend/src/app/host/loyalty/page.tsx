'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi } from '@/lib/api';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  Loader2, Info, X, ChevronDown, Star, Check,
  Moon, BarChart3, CalendarCheck, Users, MessageSquare, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MetricData {
  value: number;
  tier: string;
}

interface LoyaltyData {
  quarter: string;
  quarterStart: string;
  quarterEnd: string;
  displayLabel: { en: string; ar: string };
  tier: string;
  tierLabel: { en: string; ar: string };
  metrics: Record<string, MetricData>;
  benefits: {
    cashbackPercent: number;
    bonusPoints: number;
    hasCertificate: boolean;
    hasBadge: boolean;
    hasMonthlyReport: boolean;
  };
  thresholds: Record<string, Record<string, number>>;
  metricLabels: Record<string, { en: string; ar: string }>;
  tierLabels: Record<string, { en: string; ar: string }>;
  tiers: string[];
  tierBenefits: Record<string, {
    cashbackPercent: number;
    bonusPoints: number;
    hasCertificate: boolean;
    hasBadge: boolean;
    hasMonthlyReport: boolean;
  }>;
  availableQuarters: { label: string; displayLabel: { en: string; ar: string } }[];
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const TIER_ORDER = ['basic', 'silver', 'gold', 'summit'];

const TIER_COLORS: Record<string, { bg: string; text: string; gradient: string; border: string }> = {
  basic:  { bg: 'bg-gray-100',    text: 'text-gray-700',    gradient: 'from-gray-400 to-gray-500',       border: 'border-gray-300' },
  silver: { bg: 'bg-slate-100',   text: 'text-slate-700',   gradient: 'from-slate-400 to-slate-600',     border: 'border-slate-300' },
  gold:   { bg: 'bg-amber-50',    text: 'text-amber-700',   gradient: 'from-amber-400 to-amber-600',     border: 'border-amber-300' },
  summit: { bg: 'bg-emerald-50',  text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-700', border: 'border-emerald-300' },
};

const TIER_STARS: Record<string, number> = { basic: 0, silver: 1, gold: 2, summit: 3 };

const METRIC_ICONS: Record<string, React.ElementType> = {
  confirmedNights:       Moon,
  averageReviews:        BarChart3,
  unitAvailability:      CalendarCheck,
  bookingsRatedByGuests: Users,
  bookingsYouRated:      MessageSquare,
  cancelledBookings:     XCircle,
};

const METRIC_KEYS = [
  'confirmedNights',
  'averageReviews',
  'unitAvailability',
  'bookingsRatedByGuests',
  'bookingsYouRated',
  'cancelledBookings',
];

// ═══════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════

const t: Record<string, Record<string, string>> = {
  pageTitle:       { en: 'Host Loyalty Program',    ar: 'برنامج ولاء المضيف' },
  aboutProgram:    { en: 'About Program',            ar: 'عن البرنامج' },
  bannerSub:       { en: 'Track your performance indicators and rise to higher levels', ar: 'تابع مؤشرات الآداء وارتق الى مستويات اعلى' },
  performanceTitle:{ en: 'Performance Indicators',   ar: 'مؤشرات الأداء' },
  performanceSub:  { en: 'Indicators are updated once daily', ar: 'تتحدث المؤشرات مرة واحدة يومياً' },
  predictionPre:   { en: 'Based on your current indicators, your next tier is', ar: 'حسب مؤشراتك الآن، فئتك القادمة هي' },
  loading:         { en: 'Loading...',               ar: 'جاري التحميل...' },
  loadError:       { en: 'Failed to load loyalty data', ar: 'فشل في تحميل بيانات الولاء' },
  howCalculated:   { en: 'How is it calculated?',    ar: 'كيف يتم حسابها؟' },
  howToImprove:    { en: 'How to improve?',          ar: 'كيف تزيدها؟' },
  close:           { en: 'Close',                    ar: 'إغلاق' },
  // About dialog tabs
  tiersRewards:    { en: 'Tiers & Rewards',          ar: 'الفئات والمكافآت' },
  comparison:      { en: 'Comparison',               ar: 'مقارنة' },
  faq:             { en: 'FAQ',                      ar: 'الأسئلة الشائعة' },
  // Benefits labels
  cashback:        { en: 'Cashback',                 ar: 'كاش باك' },
  bonusPoints:     { en: 'Bonus Points',             ar: 'نقاط إضافية' },
  certificate:     { en: 'Certificate',              ar: 'شهادة' },
  badge:           { en: 'Badge',                    ar: 'شارة' },
  monthlyReport:   { en: 'Monthly Report',           ar: 'تقرير شهري' },
  yes:             { en: 'Yes', ar: 'نعم' },
  no:              { en: 'No',  ar: 'لا' },
  metric:          { en: 'Metric', ar: 'المؤشر' },
};

// ── Metric info content ──────────────────────────────────────────────

const METRIC_INFO: Record<string, {
  howCalculated: { en: string; ar: string };
  howToImprove: { en: string[]; ar: string[] };
}> = {
  confirmedNights: {
    howCalculated: {
      en: 'Total confirmed booking nights across all your units during this quarter.',
      ar: 'إجمالي ليالي الحجوزات المؤكدة عبر جميع وحداتك خلال هذا الربع.',
    },
    howToImprove: {
      en: [
        'Keep your calendar open and updated',
        'Offer competitive pricing',
        'Respond quickly to booking requests',
        'Add attractive photos and descriptions',
      ],
      ar: [
        'حافظ على تقويمك مفتوحاً ومحدثاً',
        'قدم أسعار تنافسية',
        'استجب بسرعة لطلبات الحجز',
        'أضف صوراً ووصفاً جذاباً',
      ],
    },
  },
  averageReviews: {
    howCalculated: {
      en: 'Average of all guest review ratings (1-10) for your properties this quarter.',
      ar: 'متوسط تقييمات الضيوف (1-10) لعقاراتك خلال هذا الربع.',
    },
    howToImprove: {
      en: [
        'Ensure cleanliness and maintenance',
        'Provide accurate property descriptions',
        'Communicate promptly with guests',
        'Provide all listed amenities',
      ],
      ar: [
        'تأكد من النظافة والصيانة',
        'قدم وصفاً دقيقاً للعقار',
        'تواصل بسرعة مع الضيوف',
        'وفر جميع المرافق المذكورة',
      ],
    },
  },
  unitAvailability: {
    howCalculated: {
      en: 'Average percentage of days your units were available (not blocked) during the quarter.',
      ar: 'متوسط نسبة الأيام المتاحة (غير المحجوبة) لوحداتك خلال الربع.',
    },
    howToImprove: {
      en: [
        'Keep your calendar open and updated',
        'Avoid blocking dates unnecessarily',
        'Use pricing strategies instead of blocking',
        'Update your availability regularly',
      ],
      ar: [
        'حافظ على تقويمك مفتوحاً ومحدثاً',
        'تجنب حجب التواريخ بدون داعي',
        'استخدم استراتيجيات التسعير بدلاً من الحجب',
        'حدث الإتاحة بانتظام',
      ],
    },
  },
  bookingsRatedByGuests: {
    howCalculated: {
      en: 'Percentage of completed bookings where the guest left a review this quarter.',
      ar: 'نسبة الحجوزات المكتملة التي ترك فيها الضيف تقييماً خلال هذا الربع.',
    },
    howToImprove: {
      en: [
        'Provide excellent hosting experiences',
        'Send a thank-you message after checkout',
        'Encourage guests to share their feedback',
        'Address any issues during the stay promptly',
      ],
      ar: [
        'قدم تجربة استضافة ممتازة',
        'أرسل رسالة شكر بعد المغادرة',
        'شجع الضيوف على مشاركة تجربتهم',
        'عالج أي مشاكل أثناء الإقامة بسرعة',
      ],
    },
  },
  bookingsYouRated: {
    howCalculated: {
      en: 'Percentage of completed bookings where you responded to the guest\'s review this quarter.',
      ar: 'نسبة الحجوزات المكتملة التي قمت بالرد على تقييم الضيف خلال هذا الربع.',
    },
    howToImprove: {
      en: [
        'Respond to every guest review',
        'Thank guests for positive reviews',
        'Address concerns in negative reviews professionally',
        'Make reviewing a regular habit',
      ],
      ar: [
        'قم بالرد على كل تقييم من الضيوف',
        'اشكر الضيوف على التقييمات الإيجابية',
        'عالج الملاحظات في التقييمات السلبية بمهنية',
        'اجعل التقييم عادة منتظمة',
      ],
    },
  },
  cancelledBookings: {
    howCalculated: {
      en: 'Number of bookings cancelled during this quarter. Lower is better.',
      ar: 'عدد الحجوزات الملغاة خلال هذا الربع. الأقل هو الأفضل.',
    },
    howToImprove: {
      en: [
        'Honor all confirmed bookings',
        'Keep your availability calendar up to date',
        'Communicate with guests before cancelling',
        'Set realistic pricing and policies',
      ],
      ar: [
        'التزم بجميع الحجوزات المؤكدة',
        'حافظ على تحديث تقويم الإتاحة',
        'تواصل مع الضيوف قبل الإلغاء',
        'ضع أسعاراً وسياسات واقعية',
      ],
    },
  },
};

// ── FAQ content ──────────────────────────────────────────────────────

const FAQ_ITEMS: { q: { en: string; ar: string }; a: { en: string; ar: string } }[] = [
  {
    q: { en: 'What is the Host Loyalty Program?', ar: 'ما هو برنامج ولاء المضيف؟' },
    a: {
      en: 'It is a quarterly program that evaluates your performance across all your units and assigns you a tier (Basic, Silver, Gold, Summit) with increasing benefits.',
      ar: 'هو برنامج ربع سنوي يقيّم أداءك عبر جميع وحداتك ويمنحك فئة (اساسي، فضي، ذهبي، القمة) مع مزايا متزايدة.',
    },
  },
  {
    q: { en: 'How is my tier determined?', ar: 'كيف يتم تحديد فئتي؟' },
    a: {
      en: 'Your tier equals your weakest metric. You must meet all 6 metric thresholds for a tier to achieve it.',
      ar: 'فئتك تساوي أضعف مؤشر لديك. يجب أن تحقق جميع المؤشرات الستة لفئة معينة للوصول إليها.',
    },
  },
  {
    q: { en: 'When are the metrics updated?', ar: 'متى يتم تحديث المؤشرات؟' },
    a: {
      en: 'Metrics are recalculated once daily and evaluated quarterly (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec).',
      ar: 'يتم إعادة حساب المؤشرات مرة واحدة يومياً وتقييمها ربع سنوي (يناير-مارس، أبريل-يونيو، يوليو-سبتمبر، أكتوبر-ديسمبر).',
    },
  },
  {
    q: { en: 'What benefits do I get?', ar: 'ما المزايا التي أحصل عليها؟' },
    a: {
      en: 'Benefits include cashback on earnings, bonus points, achievement certificates, profile badges, and monthly performance reports depending on your tier.',
      ar: 'تشمل المزايا كاش باك على الأرباح، نقاط إضافية، شهادات إنجاز، شارات الملف الشخصي، وتقارير أداء شهرية حسب فئتك.',
    },
  },
  {
    q: { en: 'Can my tier go down?', ar: 'هل يمكن أن تنخفض فئتي؟' },
    a: {
      en: 'Yes, tiers are re-evaluated each quarter based on your latest performance. If your metrics drop, your tier may decrease.',
      ar: 'نعم، يتم إعادة تقييم الفئات كل ربع سنة بناءً على أدائك الأخير. إذا انخفضت مؤشراتك، قد تنخفض فئتك.',
    },
  },
  {
    q: { en: 'What does "cancelled bookings" metric mean?', ar: 'ماذا يعني مؤشر "الحجوزات الملغاة"؟' },
    a: {
      en: 'This counts the number of bookings cancelled during the quarter. Unlike other metrics, lower is better here — fewer cancellations earn a higher tier.',
      ar: 'يحسب عدد الحجوزات الملغاة خلال الربع. بخلاف المؤشرات الأخرى، الأقل هنا أفضل — إلغاءات أقل تعني فئة أعلى.',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// TIER BANNER
// ═══════════════════════════════════════════════════════════════════════

function TierBanner({ tier, tierLabel, lang }: { tier: string; tierLabel: { en: string; ar: string }; lang: 'en' | 'ar' }) {
  const stars = TIER_STARS[tier] || 0;
  const colors = TIER_COLORS[tier] || TIER_COLORS.basic;

  return (
    <div className={cn('rounded-2xl bg-gradient-to-r p-6 text-white relative overflow-hidden', colors.gradient)}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 end-4 text-6xl font-bold opacity-20 select-none">
          {stars > 0 && '★'.repeat(stars)}
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          {stars > 0 && (
            <div className="flex gap-0.5">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-white text-white" />
              ))}
            </div>
          )}
          <span className="text-xl font-bold">{tierLabel[lang]}</span>
        </div>
        <p className="text-sm text-white/80">{t.bannerSub[lang]}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// QUARTER SELECTOR
// ═══════════════════════════════════════════════════════════════════════

function QuarterSelector({
  availableQuarters,
  selectedQuarter,
  onChange,
  lang,
}: {
  availableQuarters: { label: string; displayLabel: { en: string; ar: string } }[];
  selectedQuarter: string;
  onChange: (q: string) => void;
  lang: 'en' | 'ar';
}) {
  const [open, setOpen] = useState(false);
  const selected = availableQuarters.find((q) => q.label === selectedQuarter);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>{selected?.displayLabel[lang] || selectedQuarter}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[200px]">
            {availableQuarters.map((q) => (
              <button
                key={q.label}
                onClick={() => { onChange(q.label); setOpen(false); }}
                className={cn(
                  'w-full px-4 py-2.5 text-sm text-start hover:bg-gray-50 transition-colors',
                  q.label === selectedQuarter ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                )}
              >
                {q.displayLabel[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TIER TRACK (horizontal 4-dot track with value marker)
// ═══════════════════════════════════════════════════════════════════════

function TierTrack({
  metricKey,
  value,
  thresholds,
  lang,
}: {
  metricKey: string;
  value: number;
  thresholds: Record<string, number>;
  lang: 'en' | 'ar';
}) {
  const isReverse = metricKey === 'cancelledBookings';
  const tierValues = TIER_ORDER.map((tier) => thresholds[tier]);

  // Compute position of value marker (0–100%)
  const getPosition = () => {
    if (isReverse) {
      // For cancelled bookings: 0 is best (rightmost), higher is worse (leftmost)
      // Thresholds: basic=6, silver=5, gold=2, summit=0
      const max = thresholds.basic; // 6
      if (value >= max) return 0;
      if (value <= 0) return 100;
      return ((max - value) / max) * 100;
    }
    // Standard metrics: higher is better
    const max = thresholds.summit;
    if (max === 0) return 0;
    if (value >= max) return 100;
    return (value / max) * 100;
  };

  const position = Math.max(0, Math.min(100, getPosition()));

  // Format display value
  const displayValue = metricKey === 'averageReviews'
    ? value.toFixed(1)
    : metricKey === 'unitAvailability' || metricKey === 'bookingsRatedByGuests' || metricKey === 'bookingsYouRated'
      ? `${value}%`
      : String(value);

  // Display threshold with unit
  const formatThreshold = (val: number) => {
    if (metricKey === 'unitAvailability' || metricKey === 'bookingsRatedByGuests' || metricKey === 'bookingsYouRated') {
      return `${val}%`;
    }
    return String(val);
  };

  return (
    <div className="mt-4 mb-2">
      {/* Track */}
      <div className="relative h-8 flex items-center">
        {/* Line */}
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-4 h-1 bg-gray-200 rounded-full" />

        {/* 4 tier dots */}
        {TIER_ORDER.map((tier, i) => {
          const left = (i / (TIER_ORDER.length - 1)) * 100;
          const colors = TIER_COLORS[tier];
          return (
            <div
              key={tier}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `calc(${left}% + ${i === 0 ? 4 : i === 3 ? -4 : 0}px)` }}
            >
              <div className={cn('w-3 h-3 rounded-full border-2 bg-white', colors.border)} />
            </div>
          );
        })}

        {/* Value marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ left: `calc(${position}% * 0.92 + 4%)` }}
        >
          <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Threshold labels */}
      <div className="relative h-5 text-[10px] text-gray-400 mt-0.5">
        {TIER_ORDER.map((tier, i) => {
          const left = (i / (TIER_ORDER.length - 1)) * 100;
          return (
            <span
              key={tier}
              className="absolute -translate-x-1/2"
              style={{ left: `calc(${left}% + ${i === 0 ? 4 : i === 3 ? -4 : 0}px)` }}
            >
              {formatThreshold(tierValues[i])}
            </span>
          );
        })}
      </div>

      {/* Current value */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">
          {displayValue}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// METRIC CARD
// ═══════════════════════════════════════════════════════════════════════

function LoyaltyMetricCard({
  metricKey,
  data,
  thresholds,
  label,
  lang,
  onInfoClick,
}: {
  metricKey: string;
  data: MetricData;
  thresholds: Record<string, number>;
  label: { en: string; ar: string };
  lang: 'en' | 'ar';
  onInfoClick: () => void;
}) {
  const Icon = METRIC_ICONS[metricKey] || BarChart3;
  const tierColor = TIER_COLORS[data.tier] || TIER_COLORS.basic;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{label[lang]}</span>
        </div>
        <button
          onClick={onInfoClick}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Info"
        >
          <Info className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Tier badge */}
      <span className={cn('inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1', tierColor.bg, tierColor.text)}>
        {data.tier}
      </span>

      {/* Tier track */}
      <TierTrack metricKey={metricKey} value={data.value} thresholds={thresholds} lang={lang} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// METRIC INFO DIALOG
// ═══════════════════════════════════════════════════════════════════════

function MetricInfoDialog({
  metricKey,
  label,
  lang,
  onClose,
}: {
  metricKey: string;
  label: { en: string; ar: string };
  lang: 'en' | 'ar';
  onClose: () => void;
}) {
  const info = METRIC_INFO[metricKey];
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{label[lang]}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* How calculated */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">{t.howCalculated[lang]}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{info.howCalculated[lang]}</p>
          </div>

          {/* How to improve */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">{t.howToImprove[lang]}</h4>
            <ul className="space-y-2">
              {info.howToImprove[lang].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
          >
            {t.close[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ABOUT PROGRAM DIALOG
// ═══════════════════════════════════════════════════════════════════════

function AboutProgramDialog({
  data,
  lang,
  onClose,
}: {
  data: LoyaltyData;
  lang: 'en' | 'ar';
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'tiers' | 'comparison' | 'faq'>('tiers');

  const tabs = [
    { key: 'tiers' as const, label: t.tiersRewards[lang] },
    { key: 'comparison' as const, label: t.comparison[lang] },
    { key: 'faq' as const, label: t.faq[lang] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">{t.aboutProgram[lang]}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'tiers' && (
            <TiersTab data={data} lang={lang} />
          )}
          {activeTab === 'comparison' && (
            <ComparisonTab data={data} lang={lang} />
          )}
          {activeTab === 'faq' && (
            <FaqTab lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tiers Tab ────────────────────────────────────────────────────────

function TiersTab({ data, lang }: { data: LoyaltyData; lang: 'en' | 'ar' }) {
  return (
    <div className="space-y-4">
      {TIER_ORDER.map((tier) => {
        const colors = TIER_COLORS[tier];
        const stars = TIER_STARS[tier];
        const label = data.tierLabels[tier];
        const benefits = data.tierBenefits[tier];

        return (
          <div key={tier} className={cn('rounded-xl border p-4', colors.border, colors.bg)}>
            <div className="flex items-center gap-2 mb-3">
              {stars > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className={cn('w-4 h-4 fill-current', colors.text)} />
                  ))}
                </div>
              )}
              <span className={cn('text-base font-bold', colors.text)}>{label[lang]}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t.cashback[lang]}:</span>
                <span className="font-semibold text-gray-800">{benefits.cashbackPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t.bonusPoints[lang]}:</span>
                <span className="font-semibold text-gray-800">{benefits.bonusPoints}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t.certificate[lang]}:</span>
                {benefits.hasCertificate
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <X className="w-3.5 h-3.5 text-gray-300" />}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t.badge[lang]}:</span>
                {benefits.hasBadge
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <X className="w-3.5 h-3.5 text-gray-300" />}
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="text-gray-500">{t.monthlyReport[lang]}:</span>
                {benefits.hasMonthlyReport
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <X className="w-3.5 h-3.5 text-gray-300" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison Tab ───────────────────────────────────────────────────

function ComparisonTab({ data, lang }: { data: LoyaltyData; lang: 'en' | 'ar' }) {
  const benefitRows = [
    { key: 'cashback', getValue: (b: LoyaltyData['tierBenefits'][string]) => `${b.cashbackPercent}%` },
    { key: 'bonusPoints', getValue: (b: LoyaltyData['tierBenefits'][string]) => String(b.bonusPoints) },
    { key: 'certificate', getValue: (b: LoyaltyData['tierBenefits'][string]) => b.hasCertificate },
    { key: 'badge', getValue: (b: LoyaltyData['tierBenefits'][string]) => b.hasBadge },
    { key: 'monthlyReport', getValue: (b: LoyaltyData['tierBenefits'][string]) => b.hasMonthlyReport },
  ];

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-start p-2 font-medium text-gray-500" />
            {TIER_ORDER.map((tier) => (
              <th key={tier} className="p-2 text-center font-semibold text-gray-700">
                {data.tierLabels[tier][lang]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Metric thresholds */}
          {METRIC_KEYS.map((key) => (
            <tr key={key} className="border-b border-gray-100">
              <td className="p-2 text-gray-600 font-medium">{data.metricLabels[key][lang]}</td>
              {TIER_ORDER.map((tier) => {
                const val = data.thresholds[key][tier];
                const isPercent = key === 'unitAvailability' || key === 'bookingsRatedByGuests' || key === 'bookingsYouRated';
                return (
                  <td key={tier} className="p-2 text-center text-gray-700">
                    {isPercent ? `${val}%` : val}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Divider */}
          <tr><td colSpan={5} className="py-2"><div className="border-t border-gray-200" /></td></tr>
          {/* Benefits */}
          {benefitRows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100">
              <td className="p-2 text-gray-600 font-medium">{t[row.key][lang]}</td>
              {TIER_ORDER.map((tier) => {
                const val = row.getValue(data.tierBenefits[tier]);
                return (
                  <td key={tier} className="p-2 text-center">
                    {typeof val === 'boolean' ? (
                      val ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <X className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-gray-700">{val}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── FAQ Tab ──────────────────────────────────────────────────────────

function FaqTab({ lang }: { lang: 'en' | 'ar' }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-start hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-800 pe-3">{item.q[lang]}</span>
            <ChevronDown className={cn('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', openIndex === i && 'rotate-180')} />
          </button>
          {openIndex === i && (
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {item.a[lang]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREDICTION BANNER
// ═══════════════════════════════════════════════════════════════════════

function PredictionBanner({ data, lang }: { data: LoyaltyData; lang: 'en' | 'ar' }) {
  // Predict next tier: find the next tier above current, or show current if already summit
  const currentIdx = TIER_ORDER.indexOf(data.tier);
  const nextTier = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : data.tier;
  const nextLabel = data.tierLabels[nextTier];
  const nextColors = TIER_COLORS[nextTier];

  return (
    <div className={cn('rounded-xl border p-4 flex items-center gap-3', nextColors.bg, nextColors.border)}>
      <Star className={cn('w-5 h-5 flex-shrink-0', nextColors.text)} />
      <p className="text-sm text-gray-700">
        <span>{t.predictionPre[lang]} </span>
        <span className={cn('font-bold', nextColors.text)}>{nextLabel[lang]}</span>
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

export default function HostLoyaltyPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'برنامج ولاء المضيف' : 'Host Loyalty Program');

  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [infoDialog, setInfoDialog] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const loadData = useCallback(async (quarter?: string) => {
    try {
      setLoading(true);
      const res = await hostApi.getLoyaltyStatus(quarter ? { quarter } : undefined);
      const d = res.data.data;
      setData(d);
      if (!selectedQuarter) setSelectedQuarter(d.quarter);
    } catch {
      // error handled by empty data state
    } finally {
      setLoading(false);
    }
  }, [selectedQuarter]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuarterChange = (q: string) => {
    setSelectedQuarter(q);
    loadData(q);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-400">
        {t.loadError[lang]}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{t.pageTitle[lang]}</h1>
        <button
          onClick={() => setAboutOpen(true)}
          className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
        >
          {t.aboutProgram[lang]}
        </button>
      </div>

      {/* Tier Banner */}
      <TierBanner tier={data.tier} tierLabel={data.tierLabel} lang={lang} />

      {/* Quarter Selector */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t.performanceTitle[lang]}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t.performanceSub[lang]}</p>
        </div>
        {data.availableQuarters && data.availableQuarters.length > 0 && (
          <QuarterSelector
            availableQuarters={data.availableQuarters}
            selectedQuarter={selectedQuarter}
            onChange={handleQuarterChange}
            lang={lang}
          />
        )}
      </div>

      {/* Metric Cards (2-col grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {METRIC_KEYS.map((key) => (
          <LoyaltyMetricCard
            key={key}
            metricKey={key}
            data={data.metrics[key]}
            thresholds={data.thresholds[key]}
            label={data.metricLabels[key]}
            lang={lang}
            onInfoClick={() => setInfoDialog(key)}
          />
        ))}
      </div>

      {/* Prediction Banner */}
      <PredictionBanner data={data} lang={lang} />

      {/* Info Dialog */}
      {infoDialog && (
        <MetricInfoDialog
          metricKey={infoDialog}
          label={data.metricLabels[infoDialog]}
          lang={lang}
          onClose={() => setInfoDialog(null)}
        />
      )}

      {/* About Program Dialog */}
      {aboutOpen && (
        <AboutProgramDialog data={data} lang={lang} onClose={() => setAboutOpen(false)} />
      )}
    </div>
  );
}
