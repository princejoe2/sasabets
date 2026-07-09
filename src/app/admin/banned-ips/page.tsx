import AdminBannedIpsClient from '@/components/admin/AdminBannedIpsClient'

export const dynamic = 'force-dynamic'

export default function AdminBannedIpsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">IP Bans</h1>
        <p className="mt-1 text-slate-500">Block abusive IP addresses from accessing the platform</p>
      </div>
      <AdminBannedIpsClient />
    </div>
  )
}
