import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import SocketProvider from '@/components/SocketProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Hostn — Vacation Rentals in Saudi Arabia | إيجارات عطلات في السعودية',
  description:
    'Discover premium chalets, villas, and vacation rentals across Saudi Arabia. Book your perfect stay with Hostn. | اكتشف شاليهات، فلل، واستراحات مميزة في السعودية.',
  keywords: 'hostn, vacation rental, Saudi Arabia, chalet, villa, إيجار عطلات, شاليهات, فلل, استراحات, السعودية, حجز',
  openGraph: {
    title: 'Hostn — Vacation Rentals in Saudi Arabia | إيجارات عطلات في السعودية',
    description: 'Book premium chalets, villas, and vacation stays in Saudi Arabia | احجز شاليهات، فلل، واستراحات في السعودية',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e1e2e',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                },
                success: { iconTheme: { primary: '#f08c0a', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            {children}
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
