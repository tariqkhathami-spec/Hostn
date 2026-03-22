import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Hostn â Luxury Vacation Rentals in Saudi Arabia',
  description:
    'Discover extraordinary chalets, villas, and exclusive retreats across Saudi Arabia. Curated luxury stays for unforgettable experiences.',
  keywords: 'luxury vacation rental, Saudi Arabia, chalet, villa, premium stays, hostn, exclusive getaway',
  openGraph: {
    title: 'Hostn â Luxury Vacation Rentals in Saudi Arabia',
    description: 'Curated luxury stays for unforgettable experiences',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
