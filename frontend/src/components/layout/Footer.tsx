'use client';

import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube, Mail, Phone } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();

  const cityNames: Record<string, { en: string; ar: string }> = {
    Riyadh: { en: 'Riyadh', ar: 'الرياض' },
    Jeddah: { en: 'Jeddah', ar: 'جدة' },
    Abha: { en: 'Abha', ar: 'أبها' },
    'Al Ula': { en: 'Al Ula', ar: 'العلا' },
    Taif: { en: 'Taif', ar: 'الطائف' },
  };

  const footerLinks = {
    [t('footer.explore')]: [
      { label: t('type.chalets'), href: '/listings?type=chalet' },
      { label: t('type.villas'), href: '/listings?type=villa' },
      { label: t('type.apartments'), href: '/listings?type=apartment' },
      { label: t('type.farms'), href: '/listings?type=farm' },
      { label: t('type.studios'), href: '/listings?type=studio' },
    ],
    [t('footer.destinations')]: Object.entries(cityNames).map(([key, names]) => ({
      label: language === 'ar' ? names.ar : names.en,
      href: `/listings?city=${key.replace(' ', '+')}`,
    })),
    [t('footer.hosting')]: [
      { label: t('footer.listProperty'), href: '/dashboard/list-property' },
      { label: t('footer.hostResources'), href: '#' },
      { label: t('footer.hostCommunity'), href: '#' },
      { label: t('footer.responsibleHosting'), href: '#' },
    ],
    [t('footer.supportTitle')]: [
      { label: t('footer.helpCenter'), href: '#' },
      { label: t('footer.safety'), href: '#' },
      { label: t('footer.cancellation'), href: '#' },
      { label: t('footer.contact'), href: '#' },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-bold text-white">Hostn</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {t('footer.description')}
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: '#' },
                { Icon: Twitter, href: '#' },
                { Icon: Facebook, href: '#' },
                { Icon: Youtube, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <a href="mailto:hello@hostn.co" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                hello@hostn.co
              </a>
              <a href="tel:+966500407888" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                0500407888
              </a>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>&copy; {new Date().getFullYear()} Hostn. {t('footer.rights')}</span>
              <Link href="#" className="hover:text-gray-300 transition-colors">{t('footer.privacy')}</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
