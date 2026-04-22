'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EarningsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/finance/statements');
  }, [router]);
  return null;
}
