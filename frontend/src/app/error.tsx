'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Error Handler for Next.js App Router
 * Catches unhandled errors and displays fallback UI
 * This is a Client Component error boundary
 */
export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error);

    // In production, you might want to send this to an error tracking service like:
    // Sentry: Sentry.captureException(error)
    // LogRocket: logRocketClient.captureException(error)
    // Datadog: window.DD_RUM?.addError(error)
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: '600px', textAlign: 'center', backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#1e1e2e' }}>
              حدث خطأ غير متوقع
            </h1>

            <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
              نعتذر عن ذلك. حاول مرة أخرى، وإذا استمرت المشكلة تواصل معنا.
            </p>

            {isDevelopment && error?.message && (
              <div style={{ backgroundColor: '#fee', padding: '16px', borderRadius: '4px', marginBottom: '24px', textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', color: '#c00', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {error.message}
                </p>
              </div>
            )}

            {isDevelopment && error?.digest && (
              <p style={{ fontSize: '12px', color: '#999', marginBottom: '24px' }}>
                Error ID: {error.digest}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#14644b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0f4133';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#14644b';
                }}
              >
                إعادة المحاولة
              </button>

              <Link href="/">
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f5f5f5',
                    color: '#1e1e2e',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eee';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5';
                  }}
                >
                  الصفحة الرئيسية
                </button>
              </Link>
            </div>

            <p style={{ fontSize: '12px', color: '#999', marginTop: '24px' }}>
              للمساعدة:{' '}
              <a href="mailto:hello@hostn.co" style={{ color: '#14644b', textDecoration: 'none' }}>
                hello@hostn.co
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
