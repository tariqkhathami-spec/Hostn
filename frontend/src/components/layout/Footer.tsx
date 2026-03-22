import Link from 'next/link';
import { Instagram, Twitter, Facebook, Youtube, Mail, Phone } from 'lucide-react';

const footerLinks = {
  Explore: [
    { label: 'Chalets', href: '/listings?type=chalet' },
    { label: 'Villas', href: '/listings?type=villa' },
    { label: 'Apartments', href: '/listings?type=apartment' },
    { label: 'Farms', href: '/listings?type=farm' },
    { label: 'Studios', href: '/listings?type=studio' },
  ],
  Destinations: [
    { label: 'Riyadh', href: '/listings?city=Riyadh' },
    { label: 'Jeddah', href: '/listings?city=Jeddah' },
    { label: 'Abha', href: '/listings?city=Abha' },
    { label: 'Al Ula', href: '/listings?city=Al+Ula' },
    { label: 'Taif', href: '/listings?city=Taif' },
  ],
  Hosting: [
    { label: 'List Your Property', href: '/dashboard/list-property' },
    { label: 'Host Resources', href: '#' },
    { label: 'Host Community', href: '#' },
    { label: 'Responsible Hosting', href: '#' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Safety Information', href: '#' },
    { label: 'Cancellation Options', href: '#' },
    { label: 'Contact Us', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-bold text-white">Hostn</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Your trusted platform for discovering and booking unique vacation rentals across the region.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Instagram, href: '#' },
                { Icon: Twitter, href: '#' },
                { Icon: Facebook, href: '#' },
                { Icon: Youtube, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact & Bottom */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <a
                href="mailto:hello@hostn.com"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                hello@hostn.com
              </a>
              <a
                href="tel:+966500000000"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4" />
                +966 50 000 0000
              </a>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Â© {new Date().getFullYear()} Hostn. All rights reserved.</span>
              <Link href="#" className="hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
