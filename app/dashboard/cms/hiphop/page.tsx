import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const HIPHOP_SECTIONS = [
  { id: 'hero', label: 'Hip Hop Page Hero', description: 'Dedicated Hip Hop page hero copy, slides, and images' },
]

export default function HipHopCmsPage() {
  return (
    <div>
      <CMSTabs />

      <div className="p-8">
        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Hip Hop CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit dedicated Hip Hop page content</p>
        </div>

        <CMSSectionTable basePath="/dashboard/cms/hiphop" sections={HIPHOP_SECTIONS} />
      </div>
    </div>
  )
}
