/**
 * app/loading.tsx — Global route-level loading skeleton
 * Shown by Next.js App Router during page transitions automatically.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 border-b border-border backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
            <div className="hidden sm:block w-24 h-5 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-16 h-5 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
            <div className="w-20 h-8 rounded-lg bg-muted animate-pulse hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Page content skeleton */}
      <main className="flex-1 pt-16">
        {/* Hero skeleton */}
        <div className="w-full h-72 md:h-96 bg-muted animate-pulse" />

        {/* Content section skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="w-48 h-7 rounded-md bg-muted animate-pulse" />
              <div className="w-72 h-4 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="w-20 h-8 rounded-md bg-muted animate-pulse" />
          </div>

          {/* Book grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-border overflow-hidden">
                <div className="aspect-[2/3] bg-muted animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-4/5 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                  <div className="h-3 w-2/3 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                  <div className="h-8 w-full rounded-lg bg-muted animate-pulse mt-2" style={{ animationDelay: `${i * 50}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
