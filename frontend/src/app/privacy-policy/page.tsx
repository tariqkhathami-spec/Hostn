'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

export default function PrivacyPage() {
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
            {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <div className="bg-white rounded-2xl shadow-card p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'مقدمة' : 'Introduction'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'هوستن ("نحن"، "لنا") تلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك الشخصية عند استخدام منصتنا.'
                  : 'Hostn ("we", "us") is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal information when you use our platform.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'المعلومات التي نجمعها' : 'Information We Collect'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'نجمع المعلومات التي تقدمها مباشرة عند إنشاء حساب أو إجراء حجز، بما في ذلك اسمك وبريدك الإلكتروني ورقم هاتفك ومعلومات الدفع.'
                  : 'We collect information you provide directly when creating an account or making a booking, including your name, email address, phone number, and payment information.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'كيف نستخدم معلوماتك' : 'How We Use Your Information'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'نستخدم معلوماتك لمعالجة الحجوزات، والتواصل معك بشأن حسابك، وتحسين خدماتنا، والامتثال للمتطلبات القانونية.'
                  : 'We use your information to process bookings, communicate with you about your account, improve our services, and comply with legal requirements.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'حماية البيانات' : 'Data Protection'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'نطبق إجراءات أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل أو الكشف.'
                  : 'We implement appropriate security measures to protect your personal information from unauthorized access, modification, or disclosure.'}
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا على hello@hostn.co'
                  : 'If you have any questions about this privacy policy, please contact us at hello@hostn.co'}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
