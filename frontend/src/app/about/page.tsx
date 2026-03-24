'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Shield, Star, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'عن هوستن' : 'About Hostn'}
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              {language === 'ar'
                ? 'منصة سعودية لحجز أفضل إيجارات العطلات في المملكة العربية السعودية'
                : 'A Saudi platform for booking the best vacation rentals across Saudi Arabia'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-8 space-y-6 text-sm text-gray-600 leading-relaxed mb-8">
            <p>
              {language === 'ar'
                ? 'هوستن هي منصة رقمية تربط بين المسافرين والمضيفين في جميع أنحاء المملكة العربية السعودية. نقدم مجموعة واسعة من العقارات المختارة بعناية، من شاليهات فاخرة إلى شقق مريحة وفلل خاصة ومزارع هادئة.'
                : 'Hostn is a digital platform connecting travelers and hosts across Saudi Arabia. We offer a curated selection of properties, from luxury chalets to cozy apartments, private villas, and peaceful farms.'}
            </p>
            <p>
              {language === 'ar'
                ? 'مهمتنا هي تسهيل تجربة الحجز مع ضمان الجودة والشفافية والأمان في كل حجز. نفتخر بكوننا منصة سعودية أولاً تفهم احتياجات السوق المحلي.'
                : 'Our mission is to simplify the booking experience while ensuring quality, transparency, and security in every reservation. We pride ourselves on being a Saudi-first platform that understands the local market.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: language === 'ar' ? 'عقارات موثقة' : 'Verified Properties', desc: language === 'ar' ? 'كل عقار يتم التحقق منه قبل النشر' : 'Every property is verified before listing' },
              { icon: Star, label: language === 'ar' ? 'تقييمات حقيقية' : 'Real Reviews', desc: language === 'ar' ? 'تقييمات من ضيوف حقيقيين' : 'Reviews from real guests' },
              { icon: Users, label: language === 'ar' ? 'دعم متواصل' : '24/7 Support', desc: language === 'ar' ? 'فريق دعم متاح على مدار الساعة' : 'Support team available around the clock' },
              { icon: Globe, label: language === 'ar' ? 'منصة سعودية' : 'Saudi-First', desc: language === 'ar' ? 'مصممة لاحتياجات السوق المحلي' : 'Designed for the local market' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl shadow-card p-5 text-center">
                <item.icon className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
