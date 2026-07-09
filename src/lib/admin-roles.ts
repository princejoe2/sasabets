export type StaffRole = 'moderator' | 'settler' | 'support' | 'analyst' | 'content'

export const ROLE_ALLOWED_PATHS: Record<StaffRole, string[]> = {
  moderator: [
    '/admin', '/admin/markets', '/admin/settle-queue', '/admin/auto-create',
    '/admin/bets', '/admin/banned-ips', '/admin/account-flags', '/admin/flags',
    '/admin/market-events', '/admin/updown', '/admin/proposals',
  ],
  settler: [
    '/admin', '/admin/settle-queue', '/admin/markets',
  ],
  support: [
    '/admin', '/admin/users', '/admin/kyc', '/admin/support',
    '/admin/notify', '/admin/activity', '/admin/transactions', '/admin/aml',
  ],
  analyst: [
    '/admin', '/admin/analytics', '/admin/activity', '/admin/transactions',
    '/admin/funds',
  ],
  content: [
    '/admin', '/admin/news',
  ],
}
