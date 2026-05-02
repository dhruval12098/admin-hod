import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero Section', description: 'Main headline, eyebrow, and CTAs' },
  { id: 'diamond-info', label: 'Diamond Info', description: 'Carat, cut, and clarity text blocks' },
  { id: 'discover-shapes', label: 'Discover Shapes', description: 'Homepage shape carousel images, titles, and descriptions' },
  { id: 'discover-rings', label: 'Discover Rings', description: 'Homepage ring carousel images, titles, and descriptions' },
  { id: 'collection', label: 'Home Collection Cards', description: 'Homepage collection cards, images, and links' },
  { id: 'bestsellers', label: 'Best Sellers', description: 'Selected existing products shown in the best sellers grid' },
  { id: 'material-strip', label: 'Material Strip', description: 'Materials title, descriptions, and icons' },
  { id: 'stats', label: 'Statistics Strip', description: 'Key metrics and achievements' },
  { id: 'manufacturing', label: 'Manufacturing Steps', description: 'Process steps and details' },
  { id: 'testimonials', label: 'Testimonials Marquee', description: 'Scrolling quote strip on the homepage' },
  { id: 'testimonials-cards', label: 'Testimonials Cards', description: 'Three testimonial cards on the homepage' },
  { id: 'couples', label: 'Couples', description: 'Love stories cards and popup content' },
  { id: 'faq', label: 'FAQ', description: 'Frequently asked questions' },
  { id: 'hiphop-showcase', label: 'Hip Hop Home Showcase', description: 'Homepage Hip Hop showcase copy, CTA, and image' },
  { id: 'hiphop', label: 'Hip Hop Page Hero', description: 'Dedicated Hip Hop page hero copy, slides, and images' },
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
