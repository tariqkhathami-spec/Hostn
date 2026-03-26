'use client';

import DashboardShell from '@/components/layout/DashboardShell';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="host">{children}</DashboardShell>;
}
