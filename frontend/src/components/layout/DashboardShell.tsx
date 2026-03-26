'use client';

import Sidebar from './Sidebar';

interface DashboardShellProps {
  role: 'guest' | 'host' | 'admin';
  children: React.ReactNode;
}

export default function DashboardShell({ role, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
