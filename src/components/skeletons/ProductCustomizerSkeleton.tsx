export default function ProductCustomizerSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="h-6 w-32 bg-neutral-200 rounded animate-pulse" />
          <div className="relative overflow-hidden rounded-3xl border border-neutral-100 bg-neutral-100 aspect-[4/5] animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-32 bg-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-48 bg-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-12 bg-neutral-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
