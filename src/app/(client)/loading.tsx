export default function ClientLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 rounded-xl bg-[#1e1e2e]" />
        <div className="mt-2 h-4 w-64 rounded-lg bg-[#1e1e2e]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-5 h-48" />
        ))}
      </div>
    </div>
  )
}
