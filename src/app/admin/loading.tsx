export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-48 rounded-xl bg-[#1a1a28]" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-[#1a1a28]" />
      </div>

      {/* Stats row skeleton */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] p-5">
            <div className="h-8 w-24 rounded-lg bg-[#1a1a28]" />
            <div className="mt-2 h-3 w-32 rounded bg-[#1a1a28]" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-[#1a1a28] bg-[#0d0d18] overflow-hidden">
        <div className="border-b border-[#1a1a28] px-5 py-4">
          <div className="h-5 w-32 rounded-lg bg-[#1a1a28]" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#1a1a28] last:border-0">
            <div className="h-5 w-20 rounded-full bg-[#1a1a28]" />
            <div className="h-4 w-32 rounded bg-[#1a1a28]" />
            <div className="ml-auto h-4 w-24 rounded bg-[#1a1a28]" />
          </div>
        ))}
      </div>
    </div>
  )
}
