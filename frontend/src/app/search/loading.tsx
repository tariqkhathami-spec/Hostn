import { PropertyGridSkeleton } from '@/components/ui/Skeleton';

export default function ListingsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar skeleton */}
      <div className="mb-8">
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse max-w-2xl" />
      </div>
      {/* Grid */}
      <PropertyGridSkeleton count={12} />
    </div>
  );
}
