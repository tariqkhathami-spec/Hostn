import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Hostn \u2014 \u0625\u064A\u062C\u0627\u0631\u0627\u062A \u0639\u0637\u0644\u0627\u062A \u0641\u0627\u062E\u0631\u0629 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629',
  description:
    '\u0627\u0643\u062A\u0634\u0641 \u0634\u0627\u0644\u064A\u0647\u0627\u062A\u060C \u0641\u0644\u0644\u060C \u0648\u0627\u0633\u062A\u0631\u0627\u062D\u0627\u062A \u0645\u0645\u064A\u0632\u0629 \u0641\u064A \u062C\u0645\u064A\u0639 \u0623\u0646\u062D\u0627\u0621 \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629. \u0627\u062D\u062C\u0632 \u0625\u0642\u0627\u0645\u062A\u0643 \u0627\u0644\u0645\u062B\u0627\u0644\u064A\u0629 \u0645\u0639 \u0647\u0648\u0633\u062A\u0646.',
  keywords: '\u0625\u064A\u062C\u0627\u0631 \u0639\u0637\u0644\u0627\u062A, \u0634\u0627\u0644\u064A\u0647\u0627\u062A, \u0641\u0644\u0644, \u0627\u0633\u062A\u0631\u0627\u062D\u0627\u062A, \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629, hostn, \u062D\u062C\u0632, vacation rental, Saudi Arabia, chalet, villa',
  openGraph: {
    title: 'Hostn \u2014 \u0625\u064A\u062C\u0627\u0631\u0627\u062A \u0639\u0637\u0644\u0627\u062A \u0641\u0627\u062E\u0631\u0629 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629',
    description: '\u0627\u062D\u062C\u0632 \u0634\u0627\u0644\u064A\u0647\u0627\u062A\u060C \u0641\u0644\u0644\u060C \u0648\u0627\u0633\u062A\u0631\u0627\u062D\u0627\u062A \u0645\u062E\u062A\u0627\u0631\u0629 \u0628\u0639\u0646\u0627\u064A\u0629 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629',
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
