import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Hostn — إيجارات عطلات فاخرة في السعودية',
  description:
    'اكتشف شاليهات، فلل، واستراحات مميزة في جميع أنحاء المملكة العربية السعودية. احجز إقامتك المثالية مع هوستن.',
  keywords: 'إيجار عطلات, شاليهات, فلل, استراحات, السعودية, hostn, حجز, vacation rental, Saudi Arabia, chalet, villa',
  openGraph: {
    title: 'Hostn — إيجارات عطلات فاخرة في السعودية',
    description: 'احجز شاليهات، فلل، واستراحات مختارة بعناية في السعودية',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <LanguageProvider>
          <AuthProvider>
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
                success: { iconTheme: { primary: '#d4af37', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
