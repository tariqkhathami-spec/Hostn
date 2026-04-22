'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Banknote, FileText, ScrollText, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  {
    href: '/finance/remittances',
    icon: Banknote,
    label: { en: 'Remittances', ar: '\u0627\u0644\u062d\u0648\u0627\u0644\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629' },
  },
  {
    href: '/finance/invoices',
    icon: FileText,
    label: { en: 'Invoices', ar: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631' },
  },
  {
    href: '/finance/statements',
    icon: ScrollText,
    label: { en: 'Statements', ar: '\u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a' },
  },
  {
    href: '/finance/payment-method',
    icon: CreditCard,
    label: { en: 'Payment Method', ar: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0633\u062a\u0644\u0627\u0645\u0643 \u0644\u0644\u0645\u0628\u0627\u0644\u063a' },
  },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div>
      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive(href)
                  ? 'border-primary-600 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label[lang]}
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}
