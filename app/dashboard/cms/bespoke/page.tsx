'use client'

import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const BESPOKE_SECTIONS = [
  { id: 'gallery', label: 'Portfolio Gallery', description: 'Manage custom jewelry portfolio items' },
  { id: 'process', label: 'Process Steps', description: 'How the bespoke process works' },
]

export default function BespokePageEditor() {
  return (
    <div>
      <CMSTabs />

      <div className="p-8">
        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Bespoke</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit bespoke page sections</p>
        </div>

        <CMSSectionTable basePath="/dashboard/cms/bespoke" sections={BESPOKE_SECTIONS} />
      </div>
    </div>
  )
}
