export default function ProductCardSkeleton() {
  return (
    <div className="group relative animate-pulse">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-200"></div>
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-neutral-200"></div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-16 rounded bg-neutral-200"></div>
            <div className="h-3 w-24 rounded bg-neutral-200"></div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-neutral-200"></div>
        </div>
      </div>
    </div>
  );
}

