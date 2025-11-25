export default function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="space-y-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <div className="space-y-5">
            <div className="relative aspect-[10/10] overflow-hidden border border-[#efe5dc] bg-neutral-100 rounded-2xl animate-pulse" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 w-20 flex-shrink-0 overflow-hidden border rounded-2xl bg-neutral-100 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="h-10 w-3/4 bg-neutral-200 rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-neutral-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-1/3 bg-neutral-200 rounded animate-pulse" />
            <div className="h-24 w-full bg-neutral-200 rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-12 w-full bg-neutral-200 rounded animate-pulse" />
              <div className="h-12 w-full bg-neutral-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-full bg-neutral-200 rounded animate-pulse" />
            <div className="h-12 w-full bg-neutral-200 rounded animate-pulse" />
            <div className="flex gap-3">
              <div className="h-14 flex-1 bg-neutral-200 rounded-2xl animate-pulse" />
              <div className="h-14 w-14 bg-neutral-200 rounded-2xl animate-pulse" />
              <div className="h-14 w-14 bg-neutral-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
