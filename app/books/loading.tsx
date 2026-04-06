import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Providers } from "@/components/providers"
import { Skeleton } from "@/components/ui/skeleton"

export default function BooksLoading() {
  return (
    <Providers>
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main id="main-content" className="flex-1 pt-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-border overflow-hidden">
                <Skeleton className="aspect-[2/3] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </Providers>
  )
}
