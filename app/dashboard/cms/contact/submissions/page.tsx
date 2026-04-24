'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ContactSubmissionsPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return
      const response = await fetch('/api/cms/contact/submissions', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    })()
  }, [])

  return <div className="min-h-screen bg-background p-8"><div className="mb-8"><Link href="/dashboard/cms/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Contact</Link></div><h1 className="mb-4 text-3xl font-semibold">Contact Submissions</h1><div className="overflow-hidden rounded-lg border bg-white"><table className="w-full"><thead><tr className="border-b bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Name</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Email</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Topic</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Message</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase">Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="px-5 py-4 text-sm">{item.full_name}</td><td className="px-5 py-4 text-sm">{item.email}</td><td className="px-5 py-4 text-sm">{item.topic}</td><td className="px-5 py-4 text-sm">{item.message}</td><td className="px-5 py-4 text-right"><button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"><Eye size={14} />View</button></td></tr>)}</tbody></table></div></div>
}
