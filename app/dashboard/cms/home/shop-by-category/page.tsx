import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { ShopByCategoryEditor, type ShopByCategoryInitialData } from './shop-by-category-editor'

async function getInitialData(): Promise<ShopByCategoryInitialData> {
  const db = createSupabaseAdminClient()
  const [sectionResult, categoriesResult, subcategoriesResult, optionsResult] = await Promise.all([
    db.from('homepage_shop_by_category').select('id, heading, shop_all_label, shop_all_link, is_enabled, desktop_columns, tablet_columns, mobile_columns').eq('section_key', 'home_shop_by_category').maybeSingle(),
    db.from('catalog_categories').select('id, name, slug, status, banner_desktop_image_path, banner_mobile_image_path, banner_desktop_image_alt, banner_mobile_image_alt').order('display_order'),
    db.from('catalog_subcategories').select('id, category_id, name, slug, status, image_path, icon_svg_path, image_alt').order('display_order'),
    db.from('catalog_options').select('id, subcategory_id, name, slug, status, image_path, icon_svg_path, image_alt').order('display_order'),
  ])
  if (sectionResult.error) throw new Error(sectionResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (subcategoriesResult.error) throw new Error(subcategoriesResult.error.message)
  if (optionsResult.error) throw new Error(optionsResult.error.message)
  const section = sectionResult.data ?? {
    id: 0,
    heading: 'Shop By Category',
    shop_all_label: 'Shop All',
    shop_all_link: '/shop',
    is_enabled: true,
    desktop_columns: 5,
    tablet_columns: 3,
    mobile_columns: 2,
  }
  const itemResult = section.id
    ? await db.from('homepage_shop_by_category_items').select('id, item_type, category_id, subcategory_id, option_id, display_order, is_active').eq('section_id', section.id).order('display_order')
    : { data: [], error: null }
  const { data: items, error: itemsError } = itemResult
  if (itemsError) throw new Error(itemsError.message)
  return {
    section,
    items: items ?? [],
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
  }
}

export default async function ShopByCategoryPage() {
  return <ShopByCategoryEditor initialData={await getInitialData()} />
}
