'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { formatPriceNumber } from '@/lib/utils';
import SarSymbol from '@/components/ui/SarSymbol';
import { ChevronDown } from 'lucide-react';

interface BnplWidgetProps {
  total: number;
}

/**
 * BNPL installment preview widget — shown on property pages and booking widget.
 * Displays Tabby and Tamara "split into 4" previews like Gathern does.
 * Only shown for amounts between 1-5000 SAR.
 * Compact by default, click to expand full details.
 */
export default function BnplWidget({ total }: BnplWidgetProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [expanded, setExpanded] = useState(false);

  // BNPL available for 1-5000 SAR
  if (total <= 0 || total > 5000) return null;

  const installment = Math.ceil((total / 4) * 100) / 100;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl mt-4 overflow-hidden">
      {/* Compact header — always visible, clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 p-3 text-start hover:bg-emerald-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-emerald-800">
            {isAr
              ? <>{'\u0642\u0633\u0651\u0645\u0647\u0627 \u0639\u0644\u0649 4 \u062F\u0641\u0639\u0627\u062A \u2014 '}<span dir="ltr"><SarSymbol /> {formatPriceNumber(installment)}</span>{' / \u062F\u0641\u0639\u0629'}</>
              : <>Split into 4 payments of <span dir="ltr"><SarSymbol /> {formatPriceNumber(installment)}</span></>
            }
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-500 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded details */}
      <div className={`transition-all duration-300 ease-in-out ${expanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-4 pb-4">
          {/* Installment timeline */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`h-1.5 rounded-full mb-1.5 ${i === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
                <p className="text-xs font-bold text-emerald-800" dir="ltr"><SarSymbol /> {formatPriceNumber(installment)}</p>
                <p className="text-[10px] text-emerald-600">
                  {i === 0
                    ? (isAr ? 'اليوم' : 'Today')
                    : (isAr ? `الشهر ${i}` : `Month ${i}`)
                  }
                </p>
              </div>
            ))}
          </div>

          {/* Provider logos */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-emerald-200">
            <div className="flex items-center gap-1.5">
              <div className="w-14 h-5 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-purple-600 tracking-wider">tabby</span>
              </div>
            </div>
            <span className="text-emerald-300">|</span>
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-5 bg-white rounded flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-blue-600 tracking-wider">tamara</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-emerald-600 mt-2">
            {isAr ? 'بدون رسوم تأخير • بدون فوائد' : 'No late fees • No interest'}
          </p>
        </div>
      </div>
    </div>
  );
}
