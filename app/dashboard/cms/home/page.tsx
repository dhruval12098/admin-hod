import { CMSTabs } from '@/components/cms-tabs'
import { CMSSectionTable } from '@/components/cms-section-table'

const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero Section', description: 'Main headline, eyebrow, and CTAs' },
  { id: 'shop-by-category', label: 'Shop By Category', description: 'Choose and order category, subcategory, and option cards shown below the hero' },
  { id: 'diamond-info', label: 'Video Highlights', description: 'Split video, heading, CTA, and feature points' },
  { id: 'discover-shapes', label: 'Discover Shapes', description: 'Homepage shape carousel images, titles, and descriptions' },
  { id: 'bestsellers', label: 'Best Sellers', description: 'Selected existing products shown in the best sellers grid' },
  { id: 'material-strip', label: 'Material Strip', description: 'Materials title, descriptions, and icons' },
  { id: 'testimonials', label: 'Testimonials Marquee', description: 'Scrolling quote strip on the homepage' },
  { id: 'trusted-partners', label: 'Trusted Partners', description: 'Scrolling partner logo strip near the bottom of the homepage' },
  { id: 'reels', label: 'Instagram Reels', description: 'Public Instagram posts shown in the homepage marquee' },
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
