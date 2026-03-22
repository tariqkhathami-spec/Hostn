import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export default function HostNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard className="w-8 h-8 text-primary-600" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Dashboard page not found
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          This section doesn't exist in your host dashboard. Head back to the overview to get started.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/host"
            className="btn-primary px-5 py-2.5 text-sm font-medium flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Overview
          </Link>
          <Link
            href="/host/listings"
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            View Listings
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: '/host', label: 'Overview' },
              { href: '/host/bookings', label: 'Bookings' },
              { href: '/host/calendar', label: 'Calendar' },
              { href: '/host/earnings', label: 'Earnings' },
              { href: '/host/reviews', label: 'Reviews' },
              { href: '/host/settings', label: 'Settings' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-gray-500 hover:text-primary-600 px-2.5 py-1.5 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
