'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const { language } = useLanguage();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error(language === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }
    // Validate email has a proper domain (e.g. user@domain.com, not user@domain)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }
    setSending(true);
    // Simulate sending
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(language === 'ar' ? 'تم إرسال رسالتك بنجاح! سنرد عليك قريباً.' : 'Message sent successfully! We will get back to you soon.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </h1>
            <p className="text-gray-500">
              {language === 'ar' ? 'نسعد بتواصلك معنا' : "We'd love to hear from you"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              {[
                { icon: Mail, label: language === 'ar' ? 'البريد الإلكتروني' : 'Email', value: 'hello@hostn.co', href: 'mailto:hello@hostn.co' },
                { icon: Phone, label: language === 'ar' ? 'الهاتف' : 'Phone', value: '0500407888', href: 'tel:+966500407888' },
                { icon: MapPin, label: language === 'ar' ? 'الموقع' : 'Location', value: language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia', href: undefined },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl shadow-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-medium text-gray-900 hover:text-primary-600">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{item.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'الاسم *' : 'Name *'}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'ar' ? 'الموضوع *' : 'Subject *'}
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'ar' ? 'الرسالة *' : 'Message *'}
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                </div>
                <div className="flex ltr:justify-end rtl:justify-start">
                  <Button type="submit" isLoading={sending} leftIcon={<Send className="w-4 h-4" />}>
                    {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
