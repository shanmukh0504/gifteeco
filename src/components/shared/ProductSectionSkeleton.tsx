export default function ProductSectionSkeleton() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-48 rounded bg-neutral-200 animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse"></div>
          <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="group relative animate-pulse">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-200"></div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-200"></div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 rounded bg-neutral-200"></div>
                <div className="h-10 w-10 rounded-lg bg-neutral-200"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
