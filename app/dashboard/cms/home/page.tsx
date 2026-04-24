'use client'

import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero Section', description: 'Main headline, eyebrow, and CTAs' },
  { id: 'diamond-info', label: 'Diamond Info', description: 'Carat, cut, and clarity text blocks' },
  { id: 'collection', label: 'Collection', description: 'Collection cards, images, and links' },
  { id: 'bestsellers', label: 'Best Sellers', description: 'Selected existing products shown in the best sellers grid' },
  { id: 'material-strip', label: 'Material Strip', description: 'Materials title, descriptions, and icons' },
  { id: 'stats', label: 'Statistics Strip', description: 'Key metrics and achievements' },
  { id: 'certifications', label: 'Certifications', description: 'Trust cards, badges, and icons' },
  { id: 'manufacturing', label: 'Manufacturing Steps', description: 'Process steps and details' },
  { id: 'testimonials', label: 'Testimonials Marquee', description: 'Scrolling quote strip on the homepage' },
  { id: 'testimonials-cards', label: 'Testimonials Cards', description: 'Three testimonial cards after certifications' },
  { id: 'couples', label: 'Couples', description: 'Love stories cards and popup content' },
  { id: 'faq', label: 'FAQ', description: 'Frequently asked questions' },
  { id: 'hiphop', label: 'Hip Hop Showcase', description: 'Hip hop hero copy, CTA, and image' },
]

export default function HomePageEditor() {
  return (
    <div>
      <CMSTabs />

      <div className="p-8">
        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Home Page</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit all sections of the home page</p>
        </div>

        <CMSSectionTable basePath="/dashboard/cms/home" sections={HOME_SECTIONS} />
      </div>
    </div>
  )
}
