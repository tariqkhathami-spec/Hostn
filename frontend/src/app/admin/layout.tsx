'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname() || '';
  const router = useRouter();

  // Account managers only have the "My hosts" pages. The server refuses
  // everything else for them; this keeps a typed URL from showing an empty
  // page full of errors.
  const isManager = user?.adminRole === 'account_manager';
  const onOwnPages = /(^|\/)my-hosts(\/|$)/.test(pathname);
  const mustLeave = !isLoading && isManager && !onOwnPages;

  useEffect(() => {
    if (mustLeave) router.replace('/admin/my-hosts');
  }, [mustLeave, router]);

  return <DashboardShell role="admin">{mustLeave ? null : children}</DashboardShell>;
}
