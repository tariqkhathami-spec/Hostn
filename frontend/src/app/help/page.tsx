'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Mail, Phone, MessageCircle, Shield, CalendarX, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  const { language } = useLanguage();

  const faqs = language === 'ar' ? [
    { q: 'كيف أحجز عقار؟', a: 'اختر العقار المناسب، حدد تواريخ الوصول والمغادرة وعدد الضيوف، ثم أتمم عملية الدفع الآمنة.' },
    { q: 'ما هي سياسة الإلغاء؟', a: 'تختلف سياسة الإلغاء حسب كل عقار. يمكنك مراجعة السياسة في صفحة تفاصيل العقار قبل الحجز.' },
    { q: 'كيف أصبح مضيفاً؟', a: 'أنشئ حساباً كمضيف أو قم بترقية حسابك الحالي، ثم أضف عقارك الأول مع الصور والتفاصيل.' },
    { q: 'هل الدفع آمن؟', a: 'نعم، نستخدم بوابة دفع مويسر المعتمدة في المملكة العربية السعودية مع تشفير كامل للبيانات.' },
    { q: 'كيف أتواصل مع المضيف؟', a: 'بعد إتمام الحجز، يمكنك التواصل مع المضيف من خلال نظام الرسائل في المنصة.' },
  ] : [
    { q: 'How do I book a property?', a: 'Select your desired property, choose check-in/check-out dates and number of guests, then complete the secure payment process.' },
    { q: 'What is the cancellation policy?', a: 'Cancellation policies vary by property. You can review the policy on the property details page before booking.' },
    { q: 'How do I become a host?', a: 'Create a host account or upgrade your existing account, then add your first property with photos and details.' },
    { q: 'Is payment secure?', a: 'Yes, we use Moyasar payment gateway, trusted in Saudi Arabia, with full data encryption.' },
    { q: 'How do I contact the host?', a: 'After completing your booking, you can communicate with the host through the platform messaging system.' },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
            {language === 'ar' ? '← الرئيسية' : '← Home'}
          </Link>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'مركز المساعدة' : 'Help Center'}
            </h1>
            <p className="text-gray-500">
              {language === 'ar' ? 'كيف نقدر نساعدك؟' : 'How can we help you?'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: Shield, label: language === 'ar' ? 'السلامة والأمان' : 'Safety & Security', desc: language === 'ar' ? 'معلومات حول حماية حسابك' : 'Learn about account protection' },
              { icon: CalendarX, label: language === 'ar' ? 'الإلغاء والاسترداد' : 'Cancellations & Refunds', desc: language === 'ar' ? 'سياسات الإلغاء واسترداد المبالغ' : 'Cancellation and refund policies' },
              { icon: HelpCircle, label: language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ', desc: language === 'ar' ? 'إجابات على الأسئلة الأكثر شيوعاً' : 'Answers to common questions' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl shadow-card p-5 text-center">
                <item.icon className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl shadow-card p-8 mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="group border-b border-gray-100 pb-4">
                  <summary className="flex justify-between items-center cursor-pointer text-sm font-medium text-gray-900 hover:text-primary-600">
                    {faq.q}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="mt-2 text-sm text-gray-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'ar' ? 'ما لقيت جوابك؟' : "Didn't find your answer?"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {language === 'ar' ? 'تواصل معنا وفريقنا بيساعدك' : 'Contact us and our team will help'}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="mailto:hello@hostn.co" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
                <Mail className="w-4 h-4" />
                hello@hostn.co
              </a>
              <a href="tel:+966500407888" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4" />
                0500407888
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
