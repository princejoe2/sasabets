import AdminSettingsClient from '@/components/admin/AdminSettingsClient'

export const dynamic = 'force-dynamic'

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Settings</h1>
        <p className="mt-1 text-slate-500">Platform configuration and controls</p>
      </div>
      <AdminSettingsClient />
    </div>
  )
}
