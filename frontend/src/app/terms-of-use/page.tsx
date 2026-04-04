'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

export default function TermsPage() {
  const { language } = useLanguage();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
            <span className="rtl:rotate-180 inline-block">&larr;</span> {language === 'ar' ? '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629' : 'Home'}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
          </h1>
          <div className="bg-white rounded-2xl shadow-card p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'قبول الشروط' : 'Acceptance of Terms'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'باستخدام منصة هوستن، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام المنصة.'
                  : 'By using the Hostn platform, you agree to be bound by these terms and conditions. If you do not agree, please do not use the platform.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'الحسابات' : 'Accounts'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'يجب عليك تقديم معلومات دقيقة وكاملة عند إنشاء حساب. أنت مسؤول عن الحفاظ على سرية بيانات حسابك.'
                  : 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'الحجوزات والإلغاء' : 'Bookings & Cancellations'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'تخضع جميع الحجوزات لسياسات الإلغاء الخاصة بكل عقار. يرجى مراجعة سياسة الإلغاء قبل إتمام الحجز.'
                  : 'All bookings are subject to the cancellation policies of each property. Please review the cancellation policy before completing your booking.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'مسؤولية المضيف' : 'Host Responsibilities'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'يلتزم المضيفون بتقديم معلومات دقيقة عن عقاراتهم والحفاظ على نظافتها وسلامتها والالتزام بالقوانين المحلية.'
                  : 'Hosts are responsible for providing accurate property information, maintaining cleanliness and safety, and complying with local regulations.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'لأي استفسارات حول الشروط والأحكام، تواصل معنا على hello@hostn.co'
                  : 'For any questions about these terms, contact us at hello@hostn.co'}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
