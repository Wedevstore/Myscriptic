export default function SubscriptionLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
      <div className="text-center mb-10">
        <div className="h-8 w-64 bg-muted rounded-lg mx-auto mb-3" />
        <div className="h-4 w-96 bg-muted rounded mx-auto" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border p-6 space-y-4">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-10 w-20 bg-muted rounded" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3 w-full bg-muted rounded" />
              ))}
            </div>
            <div className="h-11 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
