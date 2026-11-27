'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import AiAssistant from '@/components/ai/AiAssistant';

interface DashboardShellProps {
  role: 'guest' | 'host' | 'admin';
  children: React.ReactNode;
}

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 rtl:left-auto rtl:right-4 z-50 p-2 bg-white rounded-xl shadow-card border border-gray-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 start-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'} lg:translate-x-0 lg:rtl:translate-x-0
      `}>
        <div className="relative h-full">
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 end-4 z-10 p-1.5 hover:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <Sidebar role={role} />
        </div>
      </div>

      <main className="flex-1 p-6 lg:p-8 overflow-auto pt-16 lg:pt-6">
        {children}
      </main>

      <AiAssistant role={role} />
    </div>
  );
}
