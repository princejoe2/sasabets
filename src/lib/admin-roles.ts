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

export type AdminPageDef = {
  href: string
  label: string
  group: string
}

/** All pages an admin can grant to staff — excludes super-admin-only pages (settings, audit, staff-roles). */
export const ALL_ADMIN_PAGES: AdminPageDef[] = [
  // Overview
  { href: '/admin/analytics',    label: 'Analytics',        group: 'Overview'      },
  { href: '/admin/proposals',    label: 'Proposals',        group: 'Overview'      },
  { href: '/admin/updown',       label: 'Up/Down',          group: 'Overview'      },
  // Markets
  { href: '/admin/markets',      label: 'Markets',          group: 'Markets'       },
  { href: '/admin/settle-queue', label: 'Settle Queue',     group: 'Markets'       },
  { href: '/admin/auto-create',  label: 'Auto-Create',      group: 'Markets'       },
  { href: '/admin/bets',         label: 'Active Bets',      group: 'Markets'       },
  { href: '/admin/payouts',      label: 'Payouts',          group: 'Markets'       },
  // Clients
  { href: '/admin/users',        label: 'Users',            group: 'Clients'       },
  { href: '/admin/kyc',          label: 'KYC Reviews',      group: 'Clients'       },
  { href: '/admin/support',      label: 'Support',          group: 'Clients'       },
  { href: '/admin/notify',       label: 'Notifications',    group: 'Clients'       },
  // Finance
  { href: '/admin/activity',     label: 'Activity',         group: 'Finance'       },
  { href: '/admin/transactions', label: 'Transactions',     group: 'Finance'       },
  { href: '/admin/withdrawals',  label: 'Withdrawals',      group: 'Finance'       },
  { href: '/admin/funds',        label: 'Funds & Rake',     group: 'Finance'       },
  { href: '/admin/aml',          label: 'AML Monitoring',   group: 'Finance'       },
  // Intelligence
  { href: '/admin/market-events', label: 'Market Events',  group: 'Intelligence'  },
  { href: '/admin/community',    label: 'Community Review', group: 'Intelligence'  },
  { href: '/admin/account-flags', label: 'Account Flags',  group: 'Intelligence'  },
  { href: '/admin/flags',        label: 'Market Disputes',  group: 'Intelligence'  },
  // Content
  { href: '/admin/news',         label: 'News Posts',       group: 'Content'       },
  // System (grantable subset)
  { href: '/admin/banned-ips',   label: 'IP Bans',          group: 'System'        },
]

export const VALID_STAFF_PATHS = new Set(['/admin', ...ALL_ADMIN_PAGES.map(p => p.href)])
