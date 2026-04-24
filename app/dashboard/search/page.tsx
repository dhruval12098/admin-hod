'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

type SearchEntry = {
  title: string
  description: string
  href: string
  keywords: string[]
}

const SEARCH_ENTRIES: SearchEntry[] = [
  { title: 'Dashboard', description: 'Overview of store activity and quick actions.', href: '/dashboard', keywords: ['dashboard', 'overview', 'home'] },
  { title: 'Products', description: 'Manage product records, media, and catalog mapping.', href: '/dashboard/products', keywords: ['products', 'product', 'sku', 'catalog'] },
  { title: 'Orders', description: 'Review customer orders and update statuses.', href: '/dashboard/orders', keywords: ['orders', 'order', 'shipping', 'status'] },
  { title: 'Customers', description: 'Browse customer accounts and activity.', href: '/dashboard/customers', keywords: ['customers', 'customer', 'users', 'accounts'] },
  { title: 'Coupons', description: 'Create and manage discount coupons.', href: '/dashboard/coupons', keywords: ['coupons', 'coupon', 'discount', 'offer'] },
  { title: 'Navbar Builder', description: 'Edit top navigation items and mega menu sections.', href: '/dashboard/navbar-builder', keywords: ['navbar', 'menu', 'navigation', 'mega menu'] },
  { title: 'CMS Home', description: 'Manage homepage sections and content blocks.', href: '/dashboard/cms/home', keywords: ['cms', 'home', 'hero', 'homepage'] },
  { title: 'CMS Support', description: 'Edit FAQ and announcement bar content.', href: '/dashboard/cms/support', keywords: ['support', 'faq', 'announcement'] },
  { title: 'Promotion Popup', description: 'Manage the storefront promotional popup modal.', href: '/dashboard/cms/promotion', keywords: ['promotion', 'popup', 'modal', 'offer'] },
  { title: 'Media Trash', description: 'Review used and unused bucket assets before permanent deletion.', href: '/dashboard/media-trash', keywords: ['media', 'trash', 'storage', 'images', 'bucket'] },
  { title: 'Inventory', description: 'Check stock and inventory levels.', href: '/dashboard/inventory', keywords: ['inventory', 'stock', 'quantity'] },
  { title: 'Bespoke', description: 'Manage bespoke submissions and custom content.', href: '/dashboard/bespoke', keywords: ['bespoke', 'custom', 'submissions'] },
  { title: 'Hip Hop Products', description: 'Manage the hip hop collection separately.', href: '/dashboard/hiphop-products', keywords: ['hip hop', 'hiphop', 'collection'] },
  { title: 'Settings', description: 'Admin settings and configuration.', href: '/dashboard/settings', keywords: ['settings', 'config', 'configuration'] },
]

export default function AdminSearchPage() {
  const searchParams = useSearchParams()
  const query = (searchParams.get('q') || '').trim().toLowerCase()

  const results = query
    ? SEARCH_ENTRIES.filter((entry) => {
        const haystack = [entry.title, entry.description, ...entry.keywords].join(' ').toLowerCase()
        return haystack.includes(query)
      })
    : SEARCH_ENTRIES

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {query ? `Showing results for "${query}"` : 'Browse admin pages and tools.'}
        </p>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="rounded-2xl border border-border bg-white p-5 shadow-xs transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-secondary p-2 text-foreground">
                  <Search size={14} />
                </div>
                <div>
                  <div className="font-jakarta text-lg font-semibold text-foreground">{entry.title}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white px-6 py-10 text-sm text-muted-foreground">
          No matching admin pages found.
        </div>
      )}
    </div>
  )
}
