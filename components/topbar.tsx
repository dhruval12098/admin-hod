'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search } from 'lucide-react'

export function Topbar() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/dashboard/search?q=${encodeURIComponent(trimmed)}` : '/dashboard/search')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-6 py-3">
      <form onSubmit={handleSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, products, orders, CMS..."
            className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-sm placeholder-muted-foreground transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
        <button
          className="relative rounded-md p-1.5 transition-colors hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-foreground" />
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  )
}
