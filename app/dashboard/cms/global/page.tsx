'use client'

import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const GLOBAL_SECTIONS = [
  { id: 'announcement', label: 'Announcement Bar', description: 'Site-wide announcement message' },
  { id: 'footer', label: 'Footer', description: 'Footer content and links' },
]

export default function GlobalCMSEditor() {
  return (
    <div>
      <CMSTabs />

      <div className="p-8">
        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Global CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage global website elements</p>
        </div>

        <CMSSectionTable basePath="/dashboard/cms/global" sections={GLOBAL_SECTIONS} />
      </div>
    </div>
  )
}
