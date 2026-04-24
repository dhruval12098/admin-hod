'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CMS_TABS = [
  { label: 'Home', href: '/dashboard/cms/home', key: 'home' },
  { label: 'About', href: '/dashboard/cms/about', key: 'about' },
  { label: 'Contact', href: '/dashboard/cms/contact', key: 'contact' },
  { label: 'Bespoke', href: '/dashboard/cms/bespoke', key: 'bespoke' },
  { label: 'Blog', href: '/dashboard/cms/blog', key: 'blog' },
  { label: 'Docs', href: '/dashboard/cms/docs', key: 'docs' },
  { label: 'Support', href: '/dashboard/cms/support', key: 'support' },
  { label: 'Promotion', href: '/dashboard/cms/promotion', key: 'promotion' },
  { label: 'Global', href: '/dashboard/cms/global', key: 'global' },
]

export function CMSTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b border-border">
      <div className="flex gap-0">
        {CMS_TABS.map((tab) => {
          const isActive = pathname.includes(tab.key)
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
