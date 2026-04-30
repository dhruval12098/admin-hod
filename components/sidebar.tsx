'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronDown,
  Tag,
  Grid3x3,
  BookText,
  PanelsTopLeft,
  Gem,
  Ruler,
  BadgeCheck,
  Sparkles,
  Receipt,
  TicketPercent,
  BadgeAlert,
  Trash,
  SwatchBook,
  Inbox,
  Files,
} from 'lucide-react'

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Bulk Imports', href: '/dashboard/product-imports', icon: Files },
  { name: 'Hip Hop Products', href: '/dashboard/hiphop-products', icon: Gem },
  { name: 'Collection Products', href: '/dashboard/collection-products', icon: Package },
  { name: 'Bespoke Products', href: '/dashboard/bespoke', icon: Sparkles },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'CMS', href: '/dashboard/cms', icon: FileText },
  { name: 'Docs', href: '/dashboard/cms/docs', icon: BookText },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Enquiries', href: '/dashboard/enquiries', icon: Inbox },
  { name: 'Coupons', href: '/dashboard/coupons', icon: TicketPercent },
  { name: 'Navbar Builder', href: '/dashboard/navbar-builder', icon: PanelsTopLeft },
  { name: 'Promotion', href: '/dashboard/cms/promotion', icon: BadgeAlert },
]

const CATALOG_ITEMS = [
  { name: 'Categories', href: '/dashboard/catalog#categories', icon: Tag },
  { name: 'Metals', href: '/dashboard/catalog/metals', icon: Grid3x3 },
  { name: 'Material Values', href: '/dashboard/catalog/material-values', icon: Grid3x3 },
  { name: 'Styles', href: '/dashboard/catalog/styles', icon: SwatchBook },
  { name: 'Stone Shapes', href: '/dashboard/catalog/stone-shapes', icon: Gem },
  { name: 'Ring Categories', href: '/dashboard/catalog/ring-sizes', icon: Ruler },
  { name: 'Certificates', href: '/dashboard/catalog/certificates', icon: BadgeCheck },
  { name: 'GST', href: '/dashboard/catalog/gst', icon: Receipt },
]

export function Sidebar({ customerCount }: { customerCount?: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`flex flex-col border-r border-border bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      } overflow-hidden`}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        {!collapsed && (
          <h2 className="font-jakarta font-semibold text-sm text-foreground tracking-tight">House of Diams</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1.5 hover:bg-secondary transition-colors duration-150"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-200 text-foreground ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((item) => {
          const Icon = item.icon
          const isExactMatch = pathname === item.href
          const isChildRoute = item.href !== '/dashboard' && pathname.startsWith(item.href + '/')
          const isActive = isExactMatch || isChildRoute
          const showBadge = item.name === 'Customers' && typeof customerCount === 'number'
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-foreground border-l-2 border-primary pl-2.5'
                  : 'text-foreground hover:bg-secondary'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.name}</span>
                  {showBadge ? (
                    <span className="ml-auto inline-flex min-w-7 items-center justify-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      {customerCount}
                    </span>
                  ) : null}
                </>
              )}
            </Link>
          )
        })}

        {/* Catalog Setup - Collapsible */}
        <div>
          <button
            onClick={() => setCatalogOpen(!catalogOpen)}
            className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/dashboard/catalog')
                ? 'bg-secondary text-foreground border-l-2 border-primary pl-2.5'
                : 'text-foreground hover:bg-secondary'
            }`}
            title={collapsed ? 'Catalog Setup' : undefined}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">Catalog Setup</span>
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 transition-transform ${catalogOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>

          {/* Catalog Sub-items */}
          {catalogOpen && !collapsed && (
            <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-border">
              {CATALOG_ITEMS.map((item) => {
                const Icon = item.icon
                const itemId = item.href.split('#')[1]
                const isActive = pathname === '/dashboard/catalog'
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === '/dashboard/settings'
              ? 'bg-secondary text-foreground border-l-2 border-primary pl-2.5'
              : 'text-foreground hover:bg-secondary'
          }`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </Link>

        <Link
          href="/dashboard/media-trash"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname === '/dashboard/media-trash'
              ? 'bg-secondary text-foreground border-l-2 border-primary pl-2.5'
              : 'text-foreground hover:bg-secondary'
          }`}
          title={collapsed ? 'Media Trash' : undefined}
        >
          <Trash size={18} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">Media Trash</span>}
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {!collapsed && <div>v1.0.0</div>}
      </div>
    </aside>
  )
}
