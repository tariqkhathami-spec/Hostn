'use client';

/**
 * Reusable loading skeleton variants for host dashboard pages.
 * Each variant matches the actual layout of its target page.
 */

interface SkeletonProps {
  className?: string;
    style?: React.CSSProperties;
}

function Bone({ className = '', style }: SkeletonProps) {
    return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} style={style} />;
}

// ── Stat cards row (used by dashboard, bookings, earnings, reviews) ──────────
function StatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${count}`} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-xl" />
            <Bone className="h-4 w-24" />
          </div>
          <Bone className="h-8 w-20" />
          <Bone className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Full-page skeletons per page type ────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-64" />
      <StatCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Bone className="h-5 w-40" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-48" />
                <Bone className="h-3 w-32" />
              </div>
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Bone className="h-5 w-32" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Bone className="h-3 w-full" />
                <Bone className="h-2 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <StatCards count={4} />
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-40 rounded-xl" />
        <Bone className="h-10 w-32 rounded-xl" />
        <Bone className="h-10 w-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Bone className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <Bone className="h-5 w-3/4" />
              <Bone className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Bone className="h-3 w-12" />
                <Bone className="h-3 w-12" />
                <Bone className="h-3 w-12" />
              </div>
              <div className="flex justify-between">
                <Bone className="h-5 w-24" />
                <Bone className="h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingsSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <StatCards count={4} />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
            <Bone className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-4 w-24" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-10 w-48 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <Bone className="h-6 w-28 rounded-full" />
        <Bone className="h-6 w-28 rounded-full" />
        <Bone className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {[1, 2].map((m) => (
            <div key={m} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <Bone className="h-5 w-32 mx-auto" />
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Bone key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <Bone className="h-5 w-32" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-4 w-full" />
              <Bone className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EarningsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-10 w-32 rounded-xl" />
      </div>
      <StatCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Bone className="h-5 w-40" />
          <div className="flex items-end gap-2 h-52">
            {Array.from({ length: 12 }).map((_, i) => (
              <Bone key={i} className="flex-1 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <Bone className="h-5 w-32" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-6 h-6 rounded-full" />
              <Bone className="flex-1 h-4" />
              <Bone className="w-16 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-48" />
      <StatCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <Bone className="h-5 w-40" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Bone className="w-6 h-3" />
              <Bone className="flex-1 h-3" />
              <Bone className="w-6 h-3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <Bone className="h-5 w-40" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-28 h-3" />
              <Bone className="flex-1 h-2" />
              <Bone className="w-8 h-3" />
            </div>
          ))}
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-24" />
            </div>
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
