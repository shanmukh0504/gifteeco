export default function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full flex-col pb-16">
        {/* Hero Banner Skeleton */}
        <section
          className="flex w-full items-center px-4 py-12 md:px-10 md:py-16"
          style={{
            background:
              "linear-gradient(#FFFFFF 0%, rgba(255,164,140,0.8) 150%)",
            minHeight: "calc(100vh - 80px)",
          }}
        >
          <div className="mx-auto flex w-full flex-col items-center gap-8 md:flex-row md:items-stretch md:gap-12">
            <div className="w-full space-y-8 md:max-w-xl">
              <div className="h-16 w-full bg-neutral-200/50 rounded-lg animate-pulse md:h-20" />
              <div className="h-6 w-5/6 bg-neutral-200/50 rounded-lg animate-pulse md:h-8" />
              <div className="flex flex-wrap gap-4">
                <div className="h-12 w-40 bg-neutral-200/50 rounded-2xl animate-pulse" />
                <div className="h-12 w-48 bg-neutral-200/50 rounded-2xl animate-pulse" />
              </div>
            </div>
            <div className="relative flex w-full justify-center md:justify-end">
              <div className="relative w-full max-w-[600px] aspect-[3/4] bg-neutral-200/50 rounded-lg animate-pulse" />
            </div>
          </div>
        </section>

        {/* Value Props Skeleton */}
        <section className="relative z-10 -mt-8 w-full md:-mt-12">
          <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white py-8 md:py-12 px-8 shadow-[0_20px_80px_rgba(23,17,23,0.08)] md:px-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 md:flex-col md:items-start lg:flex-row"
                >
                  <div className="h-14 w-14 bg-neutral-200 rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Showcase Skeleton */}
        <div className="bg-neutral-50">
          <section className="mx-auto w-full max-w-6xl px-4 py-12">
            <div className="mb-6 h-8 w-32 bg-neutral-200 rounded mx-auto animate-pulse" />
            <div className="mb-8 flex justify-center gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-5 w-20 bg-neutral-200 rounded animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group relative animate-pulse">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-200" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-neutral-200" />
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-16 rounded bg-neutral-200" />
                      <div className="h-10 w-10 rounded-lg bg-neutral-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Additional Product Rows Skeleton */}
          {[1, 2].map((row) => (
            <section key={row} className="mx-auto w-full max-w-6xl px-4 py-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="h-6 w-32 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse" />
                  <div className="h-10 w-10 rounded-full bg-neutral-200 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group relative animate-pulse">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-200" />
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-neutral-200" />
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-16 rounded bg-neutral-200" />
                        <div className="h-10 w-10 rounded-lg bg-neutral-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
