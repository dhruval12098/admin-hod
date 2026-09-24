import { z } from 'zod'
const id = z.number().int().positive().optional()
const text = z.string()

export const cmsContentListSchemas = {
  about_values: z.array(z.object({ id, icon_path: text, image_path: text, image_alt: text, title: text, description: text }).strict()).max(100),
  about_timeline: z.array(z.object({ id, year: text, label: text }).strict()).max(100),
  about_founders: z.array(z.object({ id, name: text, designation: text, bio: text, image_path: text }).strict()).max(100),
  contact_info: z.array(z.object({ id, label: text, value: text, note: text, href: text, icon_path: text }).strict()).max(100),
  bespoke_process: z.array(z.object({ id, eyebrow: text, title: text, description: text }).strict()).max(100),
  bespoke_manufacturing: z.array(z.object({
    id,
    step: text,
    eyebrow: text,
    title: text,
    description: text,
    media_type: z.enum(['image', 'video']),
    media_path: text,
    image_path: text,
  }).strict()).max(100),
}
