import Skeleton from '@/components/ui/Skeleton';

export default function PropertyDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-48 mb-6" />

      {/* Title */}
      <Skeleton className="h-8 w-2/3 mb-2" />
      <Skeleton className="h-4 w-1/3 mb-6" />

      {/* Image gallery skeleton */}
      <div className="grid grid-cols-4 gap-2 mb-8 rounded-2xl overflow-hidden">
        <div className="col-span-2 row-span-2">
          <Skeleton className="aspect-[4/3] rounded-none" />
        </div>
        <Skeleton className="aspect-square rounded-none" />
        <Skeleton className="aspect-square rounded-none" />
        <Skeleton className="aspect-square rounded-none" />
        <Skeleton className="aspect-square rounded-none" />
      </div>

      {/* Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
