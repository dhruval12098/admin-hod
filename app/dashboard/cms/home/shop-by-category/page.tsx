import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { ShopByCategoryEditor, type ShopByCategoryInitialData } from './shop-by-category-editor'
import { loadHomeGroup1Snapshot } from '@/lib/cms-home-group1-save'

async function getInitialData(): Promise<ShopByCategoryInitialData> {
  const db = createSupabaseAdminClient()
  const [snapshot, categoriesResult, subcategoriesResult, optionsResult] = await Promise.all([
    loadHomeGroup1Snapshot(db, 'shop_by_category'),
    db.from('catalog_categories').select('id, name, slug, status, banner_desktop_image_path, banner_mobile_image_path, banner_desktop_image_alt, banner_mobile_image_alt').order('display_order'),
    db.from('catalog_subcategories').select('id, category_id, name, slug, status, image_path, icon_svg_path, image_alt').order('display_order'),
    db.from('catalog_options').select('id, subcategory_id, name, slug, status, image_path, icon_svg_path, image_alt').order('display_order'),
  ])
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (subcategoriesResult.error) throw new Error(subcategoriesResult.error.message)
  if (optionsResult.error) throw new Error(optionsResult.error.message)
  const storedSection = snapshot.section
  const section = storedSection ? {
    id: Number(storedSection.id),
    heading: String(storedSection.heading ?? 'Shop By Category'),
    shop_all_label: storedSection.shop_all_label == null ? null : String(storedSection.shop_all_label),
    shop_all_link: storedSection.shop_all_link == null ? null : String(storedSection.shop_all_link),
    is_enabled: Boolean(storedSection.is_enabled),
    desktop_columns: Number(storedSection.desktop_columns),
    tablet_columns: Number(storedSection.tablet_columns),
    mobile_columns: Number(storedSection.mobile_columns),
  } : { id: 0, heading: 'Shop By Category', shop_all_label: 'Shop All', shop_all_link: '/shop', is_enabled: true, desktop_columns: 5, tablet_columns: 3, mobile_columns: 2 }
  return {
    section,
    items: snapshot.items.map((item) => ({
      id: Number(item.id),
      item_type: String(item.item_type) as 'category' | 'subcategory' | 'option',
      category_id: item.category_id == null ? null : String(item.category_id),
      subcategory_id: item.subcategory_id == null ? null : String(item.subcategory_id),
      option_id: item.option_id == null ? null : String(item.option_id),
      display_order: Number(item.display_order),
      is_active: Boolean(item.is_active),
    })),
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
    revision: snapshot.revision,
  }
}

export default async function ShopByCategoryPage() {
  return <ShopByCategoryEditor initialData={await getInitialData()} />
}
