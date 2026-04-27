'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Edit2 } from 'lucide-react'
import { CMSTabs } from '@/components/cms-tabs'
import { supabase } from '@/lib/supabase'
import { TablePagination } from '@/components/table-pagination'

type BlogListItem = {
  id: number
  slug: string
  title: string
  category: string
  author: string
  date_label: string
  read_time: string
  is_published: boolean
  sort_order: number
  updated_at: string
}
const PAGE_SIZE = 20

export default function BlogCMSPage() {
  const [items, setItems] = useState<BlogListItem[]>([])
  const [status, setStatus] = useState('Loading blogs...')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return setStatus('You are not signed in.')

      const response = await fetch('/api/cms/blog/posts', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = (await response.json().catch(() => null)) as { items?: BlogListItem[]; error?: string } | null
      if (!response.ok) return setStatus(payload?.error ?? 'Unable to load blogs.')

      setItems(payload?.items ?? [])
      setPage(1)
      setStatus('Blogs loaded')
    }

    load()
  }, [])

  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, page])

  return (
    <div>
      <CMSTabs />
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-jakarta text-3xl font-semibold text-foreground">Blog</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage all blog posts and create new articles.</p>
            <p className="mt-2 text-xs text-muted-foreground">{status}</p>
          </div>
          <Link href="/dashboard/cms/blog/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
            <Plus size={16} />
            Create Blog
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Author</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Published</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                  <td className="px-5 py-4 text-sm">{item.title}</td>
                  <td className="px-5 py-4 text-sm">{item.category}</td>
                  <td className="px-5 py-4 text-sm">{item.author}</td>
                  <td className="px-5 py-4 text-sm">{item.is_published ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/dashboard/cms/blog/${item.id}`} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                      <Edit2 size={14} />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length > PAGE_SIZE ? (
          <TablePagination page={page} totalItems={items.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        ) : null}
      </div>
    </div>
  )
}
