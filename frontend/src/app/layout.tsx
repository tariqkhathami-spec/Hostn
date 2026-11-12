import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import SocketProvider from '@/components/SocketProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://hostn.co'),
  title: {
    default: 'هوستن Hostn — حجز شاليهات واستراحات ومزارع في السعودية',
    template: '%s | Hostn',
  },
  description:
    'احجز شاليهات واستراحات ومزارع وفلل موثّقة في مدن المملكة، بسعر نهائي واضح قبل الدفع. | Book verified chalets, rest houses, farms and villas across Saudi Arabia with clear final prices.',
  keywords:
    'هوستن, حجز شاليهات, استراحات, مزارع, فلل, شاليهات الرياض, شاليهات جدة, إيجار يومي, السعودية, hostn, chalet booking, vacation rental, Saudi Arabia',
  applicationName: 'Hostn',
  openGraph: {
    title: 'هوستن Hostn — إجازتك الجاية تبدأ من هنا',
    description: 'شاليهات واستراحات ومزارع موثّقة في كل مدن المملكة، بأسعار واضحة بدون مفاجآت.',
    url: 'https://hostn.co',
    siteName: 'Hostn',
    locale: 'ar_SA',
    type: 'website',
    images: [{ url: '/brand/hero.jpg', width: 1920, height: 1280, alt: 'Hostn' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'هوستن Hostn — حجز شاليهات واستراحات في السعودية',
    description: 'شاليهات واستراحات ومزارع موثّقة بأسعار واضحة.',
    images: ['/brand/hero.jpg'],
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
