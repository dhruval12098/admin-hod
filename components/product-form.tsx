'use client'

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff, Loader2, Plus, Trash2, Video, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  CatalogCategory,
  CatalogCertificate,
  CatalogGstSlab,
  CatalogMetal,
  CatalogMaterialValue,
  CatalogOption,
  CatalogRingCategory,
  CatalogRingCategorySize,
  CatalogStoneShape,
  ProductContentRule,
  CatalogStyle,
  CatalogSubcategory,
  ProductDetailSection,
  ProductFaqItem,
  ProductKeyValue,
  ProductMetalMedia,
  ProductMetalVariant,
  ProductPurityPrice,
  ProductVariantMediaItem,
} from '@/lib/product-catalog'
import { formatCategoryPath } from '@/lib/product-catalog'
import { buildCombinedMetalDisplayLabel } from '@/lib/product-metal-variants'
import { KeyValueSection } from '@/components/product-form/KeyValueSection'
import { PolicyEditor } from '@/components/product-form/PolicyEditor'
import { ProductFaqEditor } from '@/components/product-form/ProductFaqEditor'
import { ProductFormStepActions, ProductFormStepBar } from '@/components/product-form/ProductFormStepNavigation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { fetchCachedQuery, setCachedQueryData } from '@/lib/query-cache'

type BootstrapPayload = {
  categories?: CatalogCategory[]
  subcategories?: CatalogSubcategory[]
  options?: CatalogOption[]
  metals?: CatalogMetal[]
  materialValues?: CatalogMaterialValue[]
  stoneShapes?: CatalogStoneShape[]
  gstSlabs?: CatalogGstSlab[]
  ringCategories?: CatalogRingCategory[]
  ringCategorySizes?: CatalogRingCategorySize[]
  certificates?: CatalogCertificate[]
  styles?: CatalogStyle[]
  productContentRules?: ProductContentRule[]
}

type ProductResponse = {
  item?: {
    name?: string
    sku?: string
    product_lane?: 'standard' | 'hiphop' | 'collection'
    detail_template?: 'standard' | 'hiphop'
    featured?: boolean
    description?: string | null
    tag_line?: string | null
    seo_title?: string | null
    seo_description?: string | null
    h1_title?: string | null
    base_price?: number | null
    discount_price?: number | null
    gst_slab_id?: string | null
    stock_quantity?: number | null
    allow_checkout?: boolean | null
    ring_enabled?: boolean | null
    ring_category_id?: string | null
    main_category_id?: string | null
    subcategory_id?: string | null
    option_id?: string | null
    linked_subcategory_ids?: string[]
    linked_option_ids?: string[]
    style_id?: string | null
    metal_ids?: string[]
    purity_values?: string[]
    purity_prices?: ProductPurityPrice[]
    default_purity_price_id?: string | null
    metal_media?: ProductMetalMedia[]
    metal_variants?: ProductMetalVariant[]
    default_variant_media_items?: ProductVariantMediaItem[]
    certificate_ids?: string[]
    ring_size_ids?: string[]
    fit_options?: string[]
    fit_label?: string | null
    gemstone_label?: string | null
    gemstone_value?: string | null
    material_value_ids?: string[]
    shapes_enabled?: boolean | null
    shape_ids?: string[]
    show_purity?: boolean | null
    engraving_enabled?: boolean | null
    engraving_label?: string | null
    shipping_rule_id?: string | null
    care_warranty_rule_id?: string | null
    shipping_enabled?: boolean | null
    care_warranty_enabled?: boolean | null
    shipping_override_enabled?: boolean | null
    care_warranty_override_enabled?: boolean | null
    shipping_title_override?: string | null
    shipping_body_override?: string | null
    care_warranty_title_override?: string | null
    care_warranty_body_override?: string | null
    features?: string[]
    specifications?: ProductKeyValue[]
    product_details?: ProductKeyValue[]
    detail_sections?: ProductDetailSection[]
    faq_items?: ProductFaqItem[]
    image_1_path?: string | null
    image_2_path?: string | null
    image_3_path?: string | null
    image_4_path?: string | null
    image_1_alt?: string | null
    image_2_alt?: string | null
    image_3_alt?: string | null
    image_4_alt?: string | null
    video_path?: string | null
    model_3d_url?: string | null
    show_image_1?: boolean | null
    show_image_2?: boolean | null
    show_image_3?: boolean | null
    show_image_4?: boolean | null
    show_video?: boolean | null
    custom_order_enabled?: boolean | null
    ready_to_ship?: boolean | null
    hiphop_badges?: string[]
    chain_length_options?: string[]
    hiphop_carat_label?: string | null
    hiphop_carat_values?: string[]
    gram_weight_label?: string | null
    gram_weight_value?: string | null
  }
}

function applyBootstrapPayload(
  payload: BootstrapPayload | null | undefined,
  setters: {
    setCategories: Dispatch<SetStateAction<CatalogCategory[]>>
    setSubcategories: Dispatch<SetStateAction<CatalogSubcategory[]>>
    setOptions: Dispatch<SetStateAction<CatalogOption[]>>
    setMetals: Dispatch<SetStateAction<CatalogMetal[]>>
    setMaterialValues: Dispatch<SetStateAction<CatalogMaterialValue[]>>
    setStoneShapes: Dispatch<SetStateAction<CatalogStoneShape[]>>
    setGstSlabs: Dispatch<SetStateAction<CatalogGstSlab[]>>
    setRingCategories: Dispatch<SetStateAction<CatalogRingCategory[]>>
    setRingCategorySizes: Dispatch<SetStateAction<CatalogRingCategorySize[]>>
    setCertificates: Dispatch<SetStateAction<CatalogCertificate[]>>
    setStyles: Dispatch<SetStateAction<CatalogStyle[]>>
    setShippingRules: Dispatch<SetStateAction<ProductContentRule[]>>
    setCareWarrantyRules: Dispatch<SetStateAction<ProductContentRule[]>>
  }
) {
  if (!payload) return

  if (payload.categories) setters.setCategories(payload.categories)
  if (payload.subcategories) setters.setSubcategories(payload.subcategories)
  if (payload.options) setters.setOptions(payload.options)
  if (payload.metals) setters.setMetals(payload.metals)
  if (payload.materialValues) setters.setMaterialValues(payload.materialValues)
  if (payload.stoneShapes) setters.setStoneShapes(payload.stoneShapes)
  if (payload.gstSlabs) setters.setGstSlabs(payload.gstSlabs)
  if (payload.ringCategories) setters.setRingCategories(payload.ringCategories)
  if (payload.ringCategorySizes) setters.setRingCategorySizes(payload.ringCategorySizes)
  if (payload.certificates) setters.setCertificates(payload.certificates)
  if (payload.styles) setters.setStyles(payload.styles)
  if (payload.productContentRules) {
    setters.setShippingRules(payload.productContentRules.filter((item) => item.kind === 'shipping'))
    setters.setCareWarrantyRules(payload.productContentRules.filter((item) => item.kind === 'care_warranty'))
  }
}

function applyProductPayload(
  item: ProductResponse['item'] | null | undefined,
  setters: {
    setName: Dispatch<SetStateAction<string>>
    setSku: Dispatch<SetStateAction<string>>
    setProductLane: Dispatch<SetStateAction<'standard' | 'hiphop' | 'collection'>>
    setDetailTemplate: Dispatch<SetStateAction<'standard' | 'hiphop'>>
    setFeatured: Dispatch<SetStateAction<boolean>>
    setBasePrice: Dispatch<SetStateAction<string>>
    setDiscountPrice: Dispatch<SetStateAction<string>>
    setGstSlabId: Dispatch<SetStateAction<string>>
    setStockQuantity: Dispatch<SetStateAction<string>>
    setAllowCheckout: Dispatch<SetStateAction<boolean>>
    setDescription: Dispatch<SetStateAction<string>>
    setTagLine: Dispatch<SetStateAction<string>>
    setSeoTitle: Dispatch<SetStateAction<string>>
    setSeoDescription: Dispatch<SetStateAction<string>>
    setH1Title: Dispatch<SetStateAction<string>>
    setMainCategoryId: Dispatch<SetStateAction<string>>
    setSubcategoryId: Dispatch<SetStateAction<string>>
    setOptionId: Dispatch<SetStateAction<string>>
    setLinkedSubcategoryIds: Dispatch<SetStateAction<string[]>>
    setLinkedOptionIds: Dispatch<SetStateAction<string[]>>
    setStyleId: Dispatch<SetStateAction<string>>
    setSelectedMetalIds: Dispatch<SetStateAction<string[]>>
    setSelectedPurities: Dispatch<SetStateAction<string[]>>
    setPurityPrices: Dispatch<SetStateAction<ProductPurityPrice[]>>
    setDefaultPurityPriceId: Dispatch<SetStateAction<string>>
    setMetalMedia: Dispatch<SetStateAction<ProductMetalMedia[]>>
    setMetalVariants: Dispatch<SetStateAction<ProductMetalVariant[]>>
    setDefaultVariantMediaItems: Dispatch<SetStateAction<ProductVariantMediaItem[]>>
    setSelectedCertificateIds: Dispatch<SetStateAction<string[]>>
    setRingSizesEnabled: Dispatch<SetStateAction<boolean>>
    setRingCategoryId: Dispatch<SetStateAction<string>>
    setFitLabel: Dispatch<SetStateAction<string>>
    setFitOptions: Dispatch<SetStateAction<string[]>>
    setFitEnabled: Dispatch<SetStateAction<boolean>>
    setGemstoneLabel: Dispatch<SetStateAction<string>>
    setGemstoneValues: Dispatch<SetStateAction<string[]>>
    setSelectedMaterialValueIds: Dispatch<SetStateAction<string[]>>
    setShapesEnabled: Dispatch<SetStateAction<boolean>>
    setSelectedShapeIds: Dispatch<SetStateAction<string[]>>
    setEngravingEnabled: Dispatch<SetStateAction<boolean>>
    setEngravingLabel: Dispatch<SetStateAction<string>>
    setShippingEnabled: Dispatch<SetStateAction<boolean>>
    setCareWarrantyEnabled: Dispatch<SetStateAction<boolean>>
    setShippingOverrideEnabled: Dispatch<SetStateAction<boolean>>
    setCareWarrantyOverrideEnabled: Dispatch<SetStateAction<boolean>>
    setShippingRuleId: Dispatch<SetStateAction<string>>
    setCareWarrantyRuleId: Dispatch<SetStateAction<string>>
    setShippingTitleOverride: Dispatch<SetStateAction<string>>
    setShippingBodyOverride: Dispatch<SetStateAction<string>>
    setCareWarrantyTitleOverride: Dispatch<SetStateAction<string>>
    setCareWarrantyBodyOverride: Dispatch<SetStateAction<string>>
    setFeatures: Dispatch<SetStateAction<string[]>>
    setSpecifications: Dispatch<SetStateAction<ProductKeyValue[]>>
    setProductDetails: Dispatch<SetStateAction<ProductKeyValue[]>>
    setDetailSections: Dispatch<SetStateAction<ProductDetailSection[]>>
    setFaqItems: Dispatch<SetStateAction<ProductFaqItem[]>>
    setImagePaths: Dispatch<SetStateAction<(string | null)[]>>
    setImageSlots: Dispatch<SetStateAction<string[]>>
    setImageAlts: Dispatch<SetStateAction<string[]>>
    setVideoPath: Dispatch<SetStateAction<string | null>>
    setModel3dUrl: Dispatch<SetStateAction<string>>
    setShowImageSlots: Dispatch<SetStateAction<boolean[]>>
    setShowVideo: Dispatch<SetStateAction<boolean>>
    setCustomOrderEnabled: Dispatch<SetStateAction<boolean>>
    setReadyToShip: Dispatch<SetStateAction<boolean>>
    setHiphopBadges: Dispatch<SetStateAction<string[]>>
    setChainLengthOptions: Dispatch<SetStateAction<string[]>>
    setHiphopCaratLabel: Dispatch<SetStateAction<string>>
    setHiphopCaratValues: Dispatch<SetStateAction<string[]>>
    setGramWeightLabel: Dispatch<SetStateAction<string>>
    setGramWeightValue: Dispatch<SetStateAction<string>>
  }
) {
  if (!item) return

  setters.setName(item.name ?? '')
  setters.setSku(item.sku ?? '')
  setters.setProductLane(item.product_lane ?? 'standard')
  setters.setDetailTemplate(item.detail_template ?? 'standard')
  setters.setFeatured(Boolean(item.featured))
  setters.setBasePrice(item.base_price?.toString() ?? '')
  setters.setDiscountPrice(item.discount_price?.toString() ?? '')
  setters.setGstSlabId(item.gst_slab_id ?? '')
  setters.setStockQuantity(String(item.stock_quantity ?? 0))
  setters.setAllowCheckout(Boolean(item.allow_checkout))
  setters.setDescription(item.description ?? '')
  setters.setTagLine(item.tag_line ?? '')
  setters.setSeoTitle(item.seo_title ?? '')
  setters.setSeoDescription(item.seo_description ?? '')
  setters.setH1Title(item.h1_title ?? '')
  setters.setMainCategoryId(item.main_category_id ?? '')
  setters.setSubcategoryId(item.subcategory_id ?? '')
  setters.setOptionId(item.option_id ?? '')
  setters.setLinkedSubcategoryIds(item.linked_subcategory_ids ?? [])
  setters.setLinkedOptionIds(item.linked_option_ids ?? [])
  setters.setStyleId(item.style_id ?? '')
  setters.setSelectedMetalIds(
    item.metal_variants?.length
      ? item.metal_variants.map((entry) => entry.metal_id)
      : (item.metal_ids ?? [])
  )
  setters.setSelectedPurities(item.purity_values ?? [])
  setters.setPurityPrices(
    item.purity_prices?.length
      ? item.purity_prices
      : (item.purity_values ?? []).map((value, index) => ({
          id: `legacy-${index}-${value.toLowerCase().replace(/\s+/g, '-')}`,
          purity_label: value,
          price: 0,
          compare_at_price: null,
          sort_order: index + 1,
        }))
  )
  setters.setDefaultPurityPriceId(item.default_purity_price_id ?? '')
  setters.setMetalMedia(item.metal_media ?? [])
  setters.setMetalVariants(item.metal_variants ?? [])
  setters.setDefaultVariantMediaItems(item.default_variant_media_items ?? [])
  setters.setSelectedCertificateIds(item.certificate_ids ?? [])
  setters.setRingSizesEnabled(Boolean(item.ring_enabled))
  setters.setRingCategoryId(item.ring_category_id ?? '')
  setters.setFitLabel(item.fit_label ?? 'Fit')
  setters.setFitOptions(item.fit_options ?? [])
  setters.setFitEnabled((item.fit_options ?? []).length > 0)
  setters.setGemstoneLabel(item.gemstone_label ?? '')
  setters.setGemstoneValues(
    item.gemstone_value
      ? item.gemstone_value
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : []
  )
  setters.setSelectedMaterialValueIds(item.material_value_ids ?? [])
  setters.setShapesEnabled(Boolean(item.shapes_enabled))
  setters.setSelectedShapeIds(item.shape_ids ?? [])
  setters.setEngravingEnabled(Boolean(item.engraving_enabled))
  setters.setEngravingLabel(item.engraving_label ?? 'Complimentary Engraving')
  setters.setShippingEnabled(item.shipping_enabled ?? true)
  setters.setCareWarrantyEnabled(item.care_warranty_enabled ?? true)
  setters.setShippingOverrideEnabled(Boolean(item.shipping_override_enabled))
  setters.setCareWarrantyOverrideEnabled(Boolean(item.care_warranty_override_enabled))
  setters.setShippingRuleId(item.shipping_rule_id ?? '')
  setters.setCareWarrantyRuleId(item.care_warranty_rule_id ?? '')
  setters.setShippingTitleOverride(item.shipping_title_override ?? '')
  setters.setShippingBodyOverride(item.shipping_body_override ?? '')
  setters.setCareWarrantyTitleOverride(item.care_warranty_title_override ?? '')
  setters.setCareWarrantyBodyOverride(item.care_warranty_body_override ?? '')
  setters.setFeatures(item.features ?? [])
  setters.setSpecifications(item.specifications?.length ? item.specifications : [emptyRow()])
  setters.setProductDetails(item.product_details?.length ? item.product_details : [emptyRow()])
  setters.setDetailSections(item.detail_sections?.length ? item.detail_sections : [emptySection()])
  setters.setFaqItems(item.faq_items?.length ? item.faq_items : [])
  setters.setImagePaths([
    item.image_1_path ?? null,
    item.image_2_path ?? null,
    item.image_3_path ?? null,
    item.image_4_path ?? null,
  ])
  setters.setImageSlots([
    item.image_1_path ?? '',
    item.image_2_path ?? '',
    item.image_3_path ?? '',
    item.image_4_path ?? '',
  ])
  setters.setImageAlts([
    item.image_1_alt ?? '',
    item.image_2_alt ?? '',
    item.image_3_alt ?? '',
    item.image_4_alt ?? '',
  ])
  setters.setVideoPath(item.video_path ?? null)
  setters.setModel3dUrl(item.model_3d_url ?? '')
  setters.setShowImageSlots([
    item.show_image_1 ?? true,
    item.show_image_2 ?? true,
    item.show_image_3 ?? true,
    item.show_image_4 ?? true,
  ])
  setters.setShowVideo(item.show_video ?? true)
  setters.setCustomOrderEnabled(Boolean(item.custom_order_enabled))
  setters.setReadyToShip(Boolean(item.ready_to_ship))
  setters.setHiphopBadges(item.hiphop_badges ?? [])
  setters.setChainLengthOptions(item.chain_length_options ?? [])
  setters.setHiphopCaratLabel(item.hiphop_carat_label ?? 'Diamond Carat')
  setters.setHiphopCaratValues(item.hiphop_carat_values ?? [])
  setters.setGramWeightLabel(item.gram_weight_label ?? 'Gram Weight')
  setters.setGramWeightValue(item.gram_weight_value ?? '')
}

const emptyRow = (): ProductKeyValue => ({ key: '', value: '' })
const emptySection = (): ProductDetailSection => ({
  id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  rows: [emptyRow()],
  visible: true,
})
type ProductMetalMediaImageField = 'image_1_path' | 'image_2_path' | 'image_3_path' | 'image_4_path'
const collectionBucket = process.env.NEXT_PUBLIC_SUPABASE_COLLECTION_BUCKET || 'hod'

export type ProductFormStepId = 'basics' | 'pricing' | 'attributes' | 'content' | 'details' | 'media'

const PRODUCT_FORM_STEPS: { id: ProductFormStepId; label: string; description: string }[] = [
  { id: 'basics', label: 'Basics', description: 'Core info, category, and template setup.' },
  { id: 'pricing', label: 'Pricing', description: 'Choose metal options, then set their prices, media, GST, discounts, and stock.' },
  { id: 'attributes', label: 'Attributes', description: 'Metals, filters, sizing, engraving, and storefront options.' },
  { id: 'content', label: 'Content', description: 'Description, highlights, and policy content.' },
  { id: 'details', label: 'Details', description: 'Specifications and detailed content sections.' },
  { id: 'media', label: 'Media', description: 'Images, video, and final review before save.' },
]
const CATALOG_BOOTSTRAP_CACHE_TTL_MS = 10 * 60 * 1000
const PRODUCT_EDIT_CACHE_TTL_MS = 2 * 60 * 1000
type CatalogBootstrapScope = 'basics' | 'pricing' | 'attributes' | 'content'

function productFormDebug(label: string, startedAt: number) {
  if (process.env.NODE_ENV !== 'development') return
  console.info(`[ProductForm] ${label}: ${Math.round(performance.now() - startedAt)}ms`)
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  return fetch(url, { ...options, headers })
}

function toggleInArray(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
}

function sanitizeRows(rows: ProductKeyValue[]) {
  return rows.filter((row) => row.key.trim() && row.value.trim())
}

function sanitizeSections(sections: ProductDetailSection[]) {
  return sections
    .map((section) => ({
      ...section,
      title: section.title.trim(),
      rows: sanitizeRows(section.rows),
    }))
    .filter((section) => section.title && section.rows.length > 0)
}

function sanitizeFaqItems(items: ProductFaqItem[]) {
  return items
    .map((item, index) => ({
      ...item,
      question: item.question.trim(),
      answer: item.answer.trim(),
      sort_order: index + 1,
      is_active: item.is_active !== false,
      source: item.source || 'admin',
    }))
    .filter((item) => item.question && item.answer)
}

function toStoragePreviewUrl(path: string | null | undefined) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return supabase.storage.from(collectionBucket).getPublicUrl(path).data.publicUrl
}

function isHipHopCategory(category?: CatalogCategory | null) {
  const source = `${category?.code ?? ''} ${category?.slug ?? ''} ${category?.name ?? ''}`.toLowerCase()
  return source.includes('hip')
}

export function ProductForm({
  productId,
  productSlug,
  forcedTemplate,
  forcedLane,
  forceHipHopCategory = false,
  backHref = '/dashboard/products',
  pageTitle,
  pageDescription,
}: {
  productId?: number | string
  productSlug?: string
  forcedTemplate?: 'standard' | 'hiphop'
  forcedLane?: 'standard' | 'hiphop' | 'collection'
  forceHipHopCategory?: boolean
  backHref?: string
  pageTitle?: string
  pageDescription?: string
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([])
  const [options, setOptions] = useState<CatalogOption[]>([])
  const [metals, setMetals] = useState<CatalogMetal[]>([])
  const [materialValues, setMaterialValues] = useState<CatalogMaterialValue[]>([])
  const [stoneShapes, setStoneShapes] = useState<CatalogStoneShape[]>([])
  const [gstSlabs, setGstSlabs] = useState<CatalogGstSlab[]>([])
  const [ringCategories, setRingCategories] = useState<CatalogRingCategory[]>([])
  const [ringCategorySizes, setRingCategorySizes] = useState<CatalogRingCategorySize[]>([])
  const [certificates, setCertificates] = useState<CatalogCertificate[]>([])
  const [styles, setStyles] = useState<CatalogStyle[]>([])
  const [shippingRules, setShippingRules] = useState<ProductContentRule[]>([])
  const [careWarrantyRules, setCareWarrantyRules] = useState<ProductContentRule[]>([])
  const [activeStep, setActiveStep] = useState<ProductFormStepId>('basics')
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [productLane, setProductLane] = useState<'standard' | 'hiphop' | 'collection'>(forcedLane ?? 'standard')
  const [detailTemplate, setDetailTemplate] = useState<'standard' | 'hiphop'>('standard')
  const [featured, setFeatured] = useState(false)
  const [basePrice, setBasePrice] = useState('')
  const [discountPrice, setDiscountPrice] = useState('')
  const [gstSlabId, setGstSlabId] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [allowCheckout, setAllowCheckout] = useState(false)
  const [description, setDescription] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [h1Title, setH1Title] = useState('')
  const [mainCategoryId, setMainCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [optionId, setOptionId] = useState('')
  const [linkedSubcategoryIds, setLinkedSubcategoryIds] = useState<string[]>([])
  const [linkedOptionIds, setLinkedOptionIds] = useState<string[]>([])
  const [styleId, setStyleId] = useState('')
  const [selectedMetalIds, setSelectedMetalIds] = useState<string[]>([])
  const [selectedPurities, setSelectedPurities] = useState<string[]>([])
  const [purityPrices, setPurityPrices] = useState<ProductPurityPrice[]>([])
  const [defaultPurityPriceId, setDefaultPurityPriceId] = useState('')
  const [metalMedia, setMetalMedia] = useState<ProductMetalMedia[]>([])
  const [metalVariants, setMetalVariants] = useState<ProductMetalVariant[]>([])
  const [defaultVariantMediaItems, setDefaultVariantMediaItems] = useState<ProductVariantMediaItem[]>([])
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([])
  const [ringSizesEnabled, setRingSizesEnabled] = useState(false)
  const [ringCategoryId, setRingCategoryId] = useState('')
  const [fitLabel, setFitLabel] = useState('Fit')
  const [fitOptions, setFitOptions] = useState<string[]>([])
  const [fitInput, setFitInput] = useState('')
  const [fitEnabled, setFitEnabled] = useState(false)
  const [gemstoneLabel, setGemstoneLabel] = useState('')
  const [gemstoneValues, setGemstoneValues] = useState<string[]>([])
  const [selectedMaterialValueIds, setSelectedMaterialValueIds] = useState<string[]>([])
  const [shapesEnabled, setShapesEnabled] = useState(false)
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([])
  const [engravingEnabled, setEngravingEnabled] = useState(false)
  const [engravingLabel, setEngravingLabel] = useState('Complimentary Engraving')
  const [shippingEnabled, setShippingEnabled] = useState(true)
  const [careWarrantyEnabled, setCareWarrantyEnabled] = useState(true)
  const [shippingOverrideEnabled, setShippingOverrideEnabled] = useState(false)
  const [careWarrantyOverrideEnabled, setCareWarrantyOverrideEnabled] = useState(false)
  const [shippingRuleId, setShippingRuleId] = useState('')
  const [careWarrantyRuleId, setCareWarrantyRuleId] = useState('')
  const [shippingTitleOverride, setShippingTitleOverride] = useState('')
  const [shippingBodyOverride, setShippingBodyOverride] = useState('')
  const [careWarrantyTitleOverride, setCareWarrantyTitleOverride] = useState('')
  const [careWarrantyBodyOverride, setCareWarrantyBodyOverride] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [specifications, setSpecifications] = useState<ProductKeyValue[]>([emptyRow()])
  const [productDetails, setProductDetails] = useState<ProductKeyValue[]>([emptyRow()])
  const [detailSections, setDetailSections] = useState<ProductDetailSection[]>([emptySection()])
  const [faqItems, setFaqItems] = useState<ProductFaqItem[]>([])
  const [loadedBootstrapScopes, setLoadedBootstrapScopes] = useState<Set<CatalogBootstrapScope>>(() => new Set())
  const [imageSlots, setImageSlots] = useState<string[]>(['', '', '', ''])
  const [imagePaths, setImagePaths] = useState<(string | null)[]>([null, null, null, null])
  const [imageAlts, setImageAlts] = useState<string[]>(['', '', '', ''])
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [model3dUrl, setModel3dUrl] = useState('')
  const [showImageSlots, setShowImageSlots] = useState([true, true, true, true])
  const [showVideo, setShowVideo] = useState(true)
  const [activeMetalMediaId, setActiveMetalMediaId] = useState('')
  const [activeVariantMediaKey, setActiveVariantMediaKey] = useState<string>('default')
  const [activeVariantMediaIndex, setActiveVariantMediaIndex] = useState<number | null>(null)
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({})
  const [deleteVariantMediaTarget, setDeleteVariantMediaTarget] = useState<{
    metalId: string | null
    itemIndex: number
    label: string
  } | null>(null)
  const [customOrderEnabled, setCustomOrderEnabled] = useState(false)
  const [readyToShip, setReadyToShip] = useState(false)
  const [hiphopBadges, setHiphopBadges] = useState<string[]>([])
  const [hiphopBadgeInput, setHiphopBadgeInput] = useState('')
  const [chainLengthOptions, setChainLengthOptions] = useState<string[]>([])
  const [chainLengthInput, setChainLengthInput] = useState('')
  const [hiphopCaratLabel, setHiphopCaratLabel] = useState('Diamond Carat')
  const [hiphopCaratValues, setHiphopCaratValues] = useState<string[]>([])
  const [hiphopCaratInput, setHiphopCaratInput] = useState('')
  const [gramWeightLabel, setGramWeightLabel] = useState('Gram Weight')
  const [gramWeightValue, setGramWeightValue] = useState('')

  const applyBootstrap = (payload: BootstrapPayload | null | undefined) =>
    applyBootstrapPayload(payload, {
      setCategories,
      setSubcategories,
      setOptions,
      setMetals,
      setMaterialValues,
      setStoneShapes,
      setGstSlabs,
      setRingCategories,
      setRingCategorySizes,
      setCertificates,
      setStyles,
      setShippingRules,
      setCareWarrantyRules,
    })

  const applyProduct = (item: ProductResponse['item'] | null | undefined) =>
    applyProductPayload(item, {
      setName,
      setSku,
      setProductLane,
      setDetailTemplate,
      setFeatured,
      setBasePrice,
      setDiscountPrice,
      setGstSlabId,
      setStockQuantity,
      setAllowCheckout,
      setDescription,
      setTagLine,
      setSeoTitle,
      setSeoDescription,
      setH1Title,
      setMainCategoryId,
      setSubcategoryId,
      setOptionId,
      setLinkedSubcategoryIds,
      setLinkedOptionIds,
      setStyleId,
      setSelectedMetalIds,
      setSelectedPurities,
      setPurityPrices,
      setDefaultPurityPriceId,
      setMetalMedia,
      setMetalVariants,
      setDefaultVariantMediaItems,
      setSelectedCertificateIds,
      setRingSizesEnabled,
      setRingCategoryId,
      setFitLabel,
      setFitOptions,
    setFitEnabled,
    setGemstoneLabel,
    setGemstoneValues,
    setSelectedMaterialValueIds,
    setShapesEnabled,
      setSelectedShapeIds,
      setEngravingEnabled,
      setEngravingLabel,
      setShippingEnabled,
      setCareWarrantyEnabled,
      setShippingOverrideEnabled,
      setCareWarrantyOverrideEnabled,
      setShippingRuleId,
      setCareWarrantyRuleId,
      setShippingTitleOverride,
      setShippingBodyOverride,
      setCareWarrantyTitleOverride,
      setCareWarrantyBodyOverride,
      setFeatures,
      setSpecifications,
      setProductDetails,
      setDetailSections,
      setFaqItems,
      setImagePaths,
      setImageSlots,
      setImageAlts,
      setVideoPath,
      setModel3dUrl,
      setShowImageSlots,
      setShowVideo,
      setCustomOrderEnabled,
      setReadyToShip,
      setHiphopBadges,
      setChainLengthOptions,
      setHiphopCaratLabel,
      setHiphopCaratValues,
      setGramWeightLabel,
      setGramWeightValue,
    })

  const markBootstrapScopeLoaded = (scope: CatalogBootstrapScope) => {
    setLoadedBootstrapScopes((current) => new Set(current).add(scope))
  }

  const loadBootstrapScope = async (scope: CatalogBootstrapScope) => {
    const startedAt = performance.now()
    const cached = catalogBootstrapCache.get(scope)

    if (cached && Date.now() - cached.loadedAt < CATALOG_BOOTSTRAP_CACHE_TTL_MS) {
      applyBootstrap(cached.payload)
      markBootstrapScopeLoaded(scope)
      productFormDebug(`catalog ${scope} cache applied`, startedAt)
      return cached.payload
    }

    const pending = catalogBootstrapPending.get(scope)
    if (pending) {
      const payload = await pending
      if (payload) {
        applyBootstrap(payload)
        markBootstrapScopeLoaded(scope)
      }
      return payload
    }

    const pendingRequest = authedFetch(`/api/catalog/bootstrap?scope=${scope}`).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as BootstrapPayload | null
      productFormDebug(`catalog ${scope} fetched`, startedAt)
      if (response.ok && payload) {
        catalogBootstrapCache.set(scope, { payload, loadedAt: Date.now() })
        return payload
      }
      return null
    }).finally(() => {
      catalogBootstrapPending.delete(scope)
    })

    catalogBootstrapPending.set(scope, pendingRequest)
    const payload = await pendingRequest
    if (payload) {
      applyBootstrap(payload)
      markBootstrapScopeLoaded(scope)
    }
    return payload
  }

  useEffect(() => {
    void loadData()
  }, [productId, productSlug])

  const loadData = async () => {
    setLoading(true)
    try {
      const productLookupUrl = productSlug ? `/api/products/by-slug/${encodeURIComponent(productSlug)}` : productId ? `/api/products/${productId}` : null
      const loadStartedAt = performance.now()
      const bootstrapPromise = loadBootstrapScope('basics')

      const productPromise = productLookupUrl
        ? (() => {
            const startedAt = performance.now()
            return authedFetch(productLookupUrl).then(async (response) => {
            const payload = (await response.json().catch(() => null)) as ProductResponse | null
            productFormDebug('product fetched', startedAt)
            return response.ok && payload?.item ? payload.item : null
            })
          })()
        : Promise.resolve(null)

      const [, productItem] = await Promise.all([bootstrapPromise, productPromise])

      if (productItem) applyProduct(productItem)
      productFormDebug('total loadData', loadStartedAt)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const requiredScopesByStep: Partial<Record<ProductFormStepId, CatalogBootstrapScope[]>> = {
      basics: ['basics'],
      pricing: ['pricing'],
      attributes: ['pricing', 'attributes'],
      content: ['content'],
      media: ['pricing'],
    }
    const scopes = requiredScopesByStep[activeStep] ?? []
    const missingScopes = scopes.filter((scope) => !loadedBootstrapScopes.has(scope))
    if (missingScopes.length < 1) return

    void Promise.all(missingScopes.map((scope) => loadBootstrapScope(scope)))
  }, [activeStep, loadedBootstrapScopes])

  const uploadMedia = async (file: File, kind: 'image' | 'video', folder: 'products' | 'hiphop') => {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', kind)
    body.append('folder', folder)

    const response = await authedFetch('/api/products/media', {
      method: 'POST',
      body,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.path) {
      throw new Error(payload?.error ?? `Unable to upload ${kind}.`)
    }

    return payload.path as string
  }

  const mainCategory = categories.find((item) => item.id === mainCategoryId)
  const effectiveProductLane = forcedLane ?? productLane
  const isLockedLaneProduct = effectiveProductLane === 'hiphop' || effectiveProductLane === 'collection'
  const isHiphopProduct = detailTemplate === 'hiphop' || isHipHopCategory(mainCategory)
  const isCollectionProduct = effectiveProductLane === 'collection'
  const activeStepIndex = PRODUCT_FORM_STEPS.findIndex((step) => step.id === activeStep)
  const isFirstStep = activeStepIndex <= 0
  const isLastStep = activeStepIndex === PRODUCT_FORM_STEPS.length - 1
  const categorySubcategories = useMemo(
    () => subcategories.filter((item) => item.category_id === mainCategoryId),
    [subcategories, mainCategoryId]
  )
  const selectedStyle = styles.find((item) => item.id === styleId)
  const selectedSubcategory = subcategories.find((item) => item.id === subcategoryId)
  const subcategoryOptions = useMemo(
    () => options.filter((item) => item.subcategory_id === subcategoryId),
    [options, subcategoryId]
  )
  const linkedSubcategoryCandidates = useMemo(
    () => categorySubcategories.filter((item) => item.id !== subcategoryId),
    [categorySubcategories, subcategoryId]
  )
  const selectedSubcategoryPoolIds = useMemo(
    () => [subcategoryId, ...linkedSubcategoryIds].filter(Boolean),
    [subcategoryId, linkedSubcategoryIds]
  )
  const linkedOptionCandidates = useMemo(
    () =>
      options.filter(
        (item) =>
          selectedSubcategoryPoolIds.includes(item.subcategory_id) &&
          item.id !== optionId
      ),
    [optionId, options, selectedSubcategoryPoolIds]
  )

  const selectedPath = useMemo(() => {
    const option = options.find((item) => item.id === optionId)
    return formatCategoryPath({ category: mainCategory, subcategory: selectedSubcategory, option }) || 'No category selected'
  }, [mainCategory, selectedSubcategory, optionId, options])

  const selectedBasePriceEntry = useMemo(
    () => purityPrices.find((entry) => entry.id === defaultPurityPriceId) ?? null,
    [defaultPurityPriceId, purityPrices]
  )
  const combinedMetalOptions = useMemo(() => {
    const flagged = metals.filter((entry) => entry.is_combined_option || Boolean(entry.purity_label))
    return flagged.length > 0 ? flagged : metals
  }, [metals])
  const usesCombinedVariantFlow = metalVariants.length > 0
  const defaultMetalVariant = useMemo(
    () => metalVariants.find((entry) => entry.is_default) ?? metalVariants[0] ?? null,
    [metalVariants]
  )
  const getMetalVariantLabel = (metalId: string) => {
    const metal = metals.find((entry) => entry.id === metalId)
    return metal ? buildCombinedMetalDisplayLabel(metal) : 'Combined option'
  }
  const getVariantMediaItems = (metalId: string) =>
    metalVariants.find((entry) => entry.metal_id === metalId)?.media_items ?? []
  const activeVariantMediaItems =
    activeVariantMediaKey === 'default'
      ? defaultVariantMediaItems
      : getVariantMediaItems(activeVariantMediaKey)

  useEffect(() => {
    if (mainCategory && isHipHopCategory(mainCategory)) {
      setDetailTemplate('hiphop')
    }
  }, [mainCategory])

  useEffect(() => {
    if (forcedTemplate) {
      setDetailTemplate(forcedTemplate)
    }
  }, [forcedTemplate])

  useEffect(() => {
    if (forcedLane) {
      setProductLane(forcedLane)
    }
  }, [forcedLane])

  useEffect(() => {
    if ((productId || productSlug) || mainCategoryId || !(forceHipHopCategory || forcedTemplate === 'hiphop')) {
      return
    }

    const hiphopCategory = categories.find((entry) => isHipHopCategory(entry))
    if (hiphopCategory) {
      setMainCategoryId(hiphopCategory.id)
      setDetailTemplate('hiphop')
    }
  }, [categories, forceHipHopCategory, forcedTemplate, mainCategoryId, productId, productSlug])

  useEffect(() => {
    if ((productId || productSlug) || mainCategoryId || !forcedLane) {
      return
    }

    const lockedCategory = categories.find(
      (entry) => (entry as CatalogCategory & { category_lane?: 'standard' | 'hiphop' | 'collection' | null }).category_lane === forcedLane
    )
    if (lockedCategory) {
      setMainCategoryId(lockedCategory.id)
      setSubcategoryId('')
      setOptionId('')
      if (forcedLane === 'hiphop') {
        setDetailTemplate('hiphop')
      }
    }
  }, [categories, forcedLane, mainCategoryId, productId, productSlug])

  useEffect(() => {
    setLinkedSubcategoryIds((prev) =>
      prev.filter(
        (id) => id !== subcategoryId && categorySubcategories.some((item) => item.id === id)
      )
    )
  }, [categorySubcategories, subcategoryId])

  useEffect(() => {
    setLinkedOptionIds((prev) =>
      prev.filter(
        (id) =>
          id !== optionId &&
          linkedOptionCandidates.some((item) => item.id === id)
      )
    )
  }, [linkedOptionCandidates, optionId])

  useEffect(() => {
    if (isCollectionProduct && allowCheckout) {
      setAllowCheckout(false)
    }
  }, [allowCheckout, isCollectionProduct])

  useEffect(() => {
    if (isCollectionProduct && detailTemplate !== 'standard') {
      setDetailTemplate('standard')
    }
  }, [detailTemplate, isCollectionProduct])

  useEffect(() => {
    setSelectedPurities(
      purityPrices
        .map((entry) => entry.purity_label.trim())
        .filter(Boolean)
    )
  }, [purityPrices])

  const effectiveGemstoneValues = useMemo(() => {
    if (selectedMaterialValueIds.length > 0) {
      return selectedMaterialValueIds
        .map((id) => materialValues.find((entry) => entry.id === id)?.name)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    }

    return gemstoneValues
  }, [gemstoneValues, materialValues, selectedMaterialValueIds])

  const effectiveSelectedMaterialValueIds = useMemo(() => {
    if (selectedMaterialValueIds.length > 0) return selectedMaterialValueIds

    return gemstoneValues
      .map((value) => materialValues.find((entry) => entry.name.toLowerCase() === value.toLowerCase())?.id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  }, [gemstoneValues, materialValues, selectedMaterialValueIds])

  useEffect(() => {
    const hasDefault = purityPrices.some((entry) => entry.id === defaultPurityPriceId)
    if (!hasDefault) {
      setDefaultPurityPriceId(purityPrices[0]?.id ?? '')
    }
  }, [defaultPurityPriceId, purityPrices])

  useEffect(() => {
    setMetalVariants((prev) => {
      const next = selectedMetalIds.map((metalId, index) => {
        const existing = prev.find((entry) => entry.metal_id === metalId)
        return (
          existing ?? {
            metal_id: metalId,
            price: Number(basePrice || purityPrices[0]?.price || 0),
            is_default: index === 0,
            sort_order: index + 1,
            media_items: [],
          }
        )
      })

      const hasDefault = next.some((entry) => entry.is_default)
      return next.map((entry, index) => ({
        ...entry,
        sort_order: index + 1,
        is_default: hasDefault ? entry.is_default : index === 0,
      }))
    })
  }, [basePrice, purityPrices, selectedMetalIds])

  useEffect(() => {
    if (!metalVariants.length) {
      setActiveVariantMediaKey('default')
      return
    }

    const keys = ['default', ...metalVariants.map((entry) => entry.metal_id)]
    if (!keys.includes(activeVariantMediaKey)) {
      setActiveVariantMediaKey(metalVariants[0].metal_id)
    }
  }, [activeVariantMediaKey, metalVariants])

  useEffect(() => {
    if (!activeVariantMediaItems.length) {
      setActiveVariantMediaIndex(null)
      return
    }

    setActiveVariantMediaIndex((prev) => {
      if (prev == null) return 0
      return prev >= activeVariantMediaItems.length ? activeVariantMediaItems.length - 1 : prev
    })
  }, [activeVariantMediaItems])

  useEffect(() => {
    if (!usesCombinedVariantFlow || !defaultMetalVariant) return
    setBasePrice(String(Number(defaultMetalVariant.price ?? 0)))
  }, [defaultMetalVariant, usesCombinedVariantFlow])

  useEffect(() => {
    if (usesCombinedVariantFlow || !selectedBasePriceEntry) {
      return
    }

    setBasePrice(String(Number(selectedBasePriceEntry.price ?? 0)))
  }, [selectedBasePriceEntry, usesCombinedVariantFlow])

  useEffect(() => {
    setMetalMedia((prev) => {
      const next = selectedMetalIds.map((metalId, index) => {
        const existing = prev.find((entry) => entry.metal_id === metalId)
        return (
          existing ?? {
            metal_id: metalId,
            image_1_path: null,
            image_2_path: null,
            image_3_path: null,
            image_4_path: null,
            video_path: null,
            is_default_fallback: index === 0,
          }
        )
      })

      return next.map((entry, index) => ({
        ...entry,
        is_default_fallback: entry.is_default_fallback || (!next.some((row) => row.is_default_fallback) && index === 0),
      }))
    })
  }, [selectedMetalIds])

  useEffect(() => {
    if (!selectedMetalIds.length) {
      setActiveMetalMediaId('')
      return
    }
    if (!selectedMetalIds.includes(activeMetalMediaId)) {
      setActiveMetalMediaId(selectedMetalIds[0])
    }
  }, [activeMetalMediaId, selectedMetalIds])

  const addFeature = () => {
    const next = featureInput.trim()
    if (!next) return
    setFeatures((prev) => [...prev, next])
    setFeatureInput('')
  }

  const addFitOption = () => {
    const next = fitInput.trim()
    if (!next) return
    setFitOptions((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setFitInput('')
  }

  const addHiphopBadge = () => {
    const next = hiphopBadgeInput.trim()
    if (!next) return
    setHiphopBadges((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setHiphopBadgeInput('')
  }

  const addChainLengthOption = () => {
    const next = chainLengthInput.trim()
    if (!next) return
    setChainLengthOptions((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setChainLengthInput('')
  }

  const addHiphopCaratValue = () => {
    const next = hiphopCaratInput.trim()
    if (!next) return
    setHiphopCaratValues((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setHiphopCaratInput('')
  }

  const updateMetalMediaEntry = (metalId: string, updater: (entry: ProductMetalMedia) => ProductMetalMedia) => {
    setMetalMedia((prev) =>
      prev.map((entry) => (entry.metal_id === metalId ? updater(entry) : entry))
    )
  }

  const updateMetalVariant = (metalId: string, updater: (entry: ProductMetalVariant) => ProductMetalVariant) => {
    setMetalVariants((prev) =>
      prev.map((entry) => (entry.metal_id === metalId ? updater(entry) : entry))
    )
  }

  const setDefaultMetalVariant = (metalId: string) => {
    setMetalVariants((prev) =>
      prev.map((entry) => ({
        ...entry,
        is_default: entry.metal_id === metalId,
      }))
    )
  }

  const addVariantMediaItem = (metalId: string | null) => {
    const nextItem: ProductVariantMediaItem = {
      media_type: 'image',
      media_path: '',
      sort_order: 1,
      is_default_fallback: !metalId,
    }

    if (!metalId) {
      const nextIndex = defaultVariantMediaItems.length
      setDefaultVariantMediaItems((prev) => [
        ...prev,
        { ...nextItem, sort_order: prev.length + 1 },
      ])
      setActiveVariantMediaIndex(nextIndex)
      return
    }

    const nextIndex = getVariantMediaItems(metalId).length
    updateMetalVariant(metalId, (entry) => ({
      ...entry,
      media_items: [
        ...(entry.media_items ?? []),
        { ...nextItem, sort_order: (entry.media_items?.length ?? 0) + 1 },
      ],
    }))
    setActiveVariantMediaIndex(nextIndex)
  }

  const updateVariantMediaItem = (
    metalId: string | null,
    itemIndex: number,
    updater: (item: ProductVariantMediaItem) => ProductVariantMediaItem
  ) => {
    if (!metalId) {
      setDefaultVariantMediaItems((prev) =>
        prev.map((item, index) => (index === itemIndex ? updater(item) : item))
      )
      return
    }

    updateMetalVariant(metalId, (entry) => ({
      ...entry,
      media_items: (entry.media_items ?? []).map((item, index) => (index === itemIndex ? updater(item) : item)),
    }))
  }

  const removeVariantMediaItem = (metalId: string | null, itemIndex: number) => {
    if (!metalId) {
      setDefaultVariantMediaItems((prev) =>
        prev
          .filter((_, index) => index !== itemIndex)
          .map((item, index) => ({ ...item, sort_order: index + 1 }))
      )
      setActiveVariantMediaIndex((prev) => {
        if (prev == null) return null
        if (prev === itemIndex) return null
        return prev > itemIndex ? prev - 1 : prev
      })
      return
    }

    updateMetalVariant(metalId, (entry) => ({
      ...entry,
      media_items: (entry.media_items ?? [])
        .filter((_, index) => index !== itemIndex)
        .map((item, index) => ({ ...item, sort_order: index + 1 })),
    }))
    setActiveVariantMediaIndex((prev) => {
      if (prev == null) return null
      if (prev === itemIndex) return null
      return prev > itemIndex ? prev - 1 : prev
    })
  }

  const setFallbackMetal = (metalId: string) => {
    setMetalMedia((prev) =>
      prev.map((entry) => ({
        ...entry,
        is_default_fallback: entry.metal_id === metalId,
      }))
    )
  }

  const applyTestData = () => {
    const category = categories[0]
    const nextSubcategory = subcategories.find((item) => item.category_id === category?.id)
    const nextOption = options.find((item) => item.subcategory_id === nextSubcategory?.id)
    const nextStyle = styles[0]
    const defaultMetals = metals.slice(0, 2).map((item) => item.id)
    const defaultCertificates = certificates.slice(0, 1).map((item) => item.id)
    setName(`${category?.name ?? 'Catalog'} Test Product`)
    setSku(`TEST-${Date.now().toString().slice(-6)}`)
    setFeatured(true)
    setBasePrice('5200')
    setDiscountPrice('4800')
    setDescription('A polished test product used to verify the aligned admin and storefront product flow.')
    setTagLine('A clean test case for aligned product data')
    setMainCategoryId(category?.id ?? '')
    setSubcategoryId(nextSubcategory?.id ?? '')
    setOptionId(nextOption?.id ?? '')
    setLinkedSubcategoryIds([])
    setLinkedOptionIds([])
    setStyleId(nextStyle?.id ?? '')
    setSelectedMetalIds(defaultMetals)
    setPurityPrices([
      { id: 'test-18k', purity_label: '18K', price: 5200, compare_at_price: 5600, sort_order: 1 },
      { id: 'test-14k', purity_label: '14K', price: 4800, compare_at_price: null, sort_order: 2 },
    ])
    setDefaultPurityPriceId('test-18k')
    setSelectedCertificateIds(defaultCertificates)
    setRingSizesEnabled(true)
    setRingCategoryId(ringCategories[0]?.id ?? '')
    setFitLabel('Fit')
    setFitOptions(['Standard', 'Comfort Fit'])
      setFitEnabled(true)
      setGemstoneLabel('Stone Type')
      setGemstoneValues(['Natural Diamond'])
      setShapesEnabled(false)
      setSelectedShapeIds([])
      setEngravingEnabled(true)
      setEngravingLabel('Complimentary Engraving')
      setShippingEnabled(true)
      setCareWarrantyEnabled(true)
      setShippingOverrideEnabled(false)
      setCareWarrantyOverrideEnabled(false)
      setShippingRuleId(shippingRules[0]?.id ?? '')
    setCareWarrantyRuleId(careWarrantyRules[0]?.id ?? '')
    setShippingTitleOverride('')
    setShippingBodyOverride('')
    setCareWarrantyTitleOverride('')
    setCareWarrantyBodyOverride('')
    setFeatures(['Made for UI testing', 'Dynamic specifications enabled', 'Admin/storefront sync test'])
    setSpecifications([
      { key: 'SKU', value: `TEST-${Date.now().toString().slice(-6)}` },
      { key: 'Crafted In', value: 'Surat, India' },
      { key: 'Finish', value: 'High Polish' },
    ])
    setProductDetails([
      { key: 'Style', value: nextStyle?.name ?? selectedStyle?.name ?? 'Signature' },
      { key: 'Wear', value: 'Everyday luxury' },
    ])
    setDetailSections([
      {
        id: 'diamond-details',
        title: 'Diamond Details',
        visible: true,
        rows: [
          { key: 'Diamond Type', value: 'Natural' },
          { key: 'Total Carat Weight', value: '0.66 Ct' },
        ],
      },
    ])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    let shouldRedirect = false

    try {
      const defaultVariant = metalVariants.find((entry) => entry.is_default) ?? metalVariants[0] ?? null
      const resolvedPrice = Number(defaultVariant?.price ?? basePrice)
      if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
        throw new Error('Add a price greater than 0 to the default metal option before saving.')
      }

      const response = await authedFetch(productId ? `/api/products/${productId}` : productSlug ? `/api/products/by-slug/${encodeURIComponent(productSlug)}` : '/api/products', {
        method: productId || productSlug ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name,
          sku,
          product_lane: effectiveProductLane,
          detail_template: detailTemplate,
          featured,
          description: description || null,
          tag_line: tagLine || null,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          h1_title: h1Title.trim() || null,
          base_price: basePrice ? Number(basePrice) : null,
          discount_price: discountPrice ? Number(discountPrice) : null,
          gst_slab_id: gstSlabId || null,
          stock_quantity: Math.max(0, Number(stockQuantity || 0)),
          status: 'active',
          main_category_id: mainCategoryId,
          subcategory_id: subcategoryId || null,
          option_id: optionId || null,
          linked_subcategory_ids: linkedSubcategoryIds,
          linked_option_ids: linkedOptionIds,
          style_id: styleId || null,
          metal_ids: selectedMetalIds,
          metal_variants: metalVariants.map((entry, index) => ({
            ...entry,
            sort_order: index + 1,
            media_items: (entry.media_items ?? [])
              .filter((item) => item.media_path?.trim())
              .map((item, itemIndex) => ({
                ...item,
                media_path: item.media_path.trim(),
                sort_order: itemIndex + 1,
              })),
          })),
          default_variant_media_items: defaultVariantMediaItems
            .filter((item) => item.media_path?.trim())
            .map((item, index) => ({
              ...item,
              media_path: item.media_path.trim(),
              sort_order: index + 1,
              is_default_fallback: true,
            })),
          purity_values: selectedPurities,
          purity_prices: purityPrices.map((entry, index) => ({
            ...entry,
            sort_order: index + 1,
          })),
          default_purity_price_id: defaultPurityPriceId || null,
          metal_media: metalMedia,
          certificate_ids: selectedCertificateIds,
            ring_size_ids: [],
            ring_enabled: ringSizesEnabled,
            ring_category_id: ringSizesEnabled ? ringCategoryId || null : null,
            fit_options: fitEnabled ? fitOptions : [],
            fit_label: fitEnabled ? fitLabel || null : null,
            gemstone_label: gemstoneLabel || null,
            gemstone_value: effectiveGemstoneValues.join(', ') || null,
            material_value_ids: effectiveSelectedMaterialValueIds,
            shapes_enabled: shapesEnabled,
            shape_ids: shapesEnabled ? selectedShapeIds : [],
            show_purity: false,
            engraving_enabled: engravingEnabled,
            engraving_label: engravingEnabled ? engravingLabel || null : null,
            shipping_enabled: shippingEnabled,
            care_warranty_enabled: careWarrantyEnabled,
            shipping_override_enabled: shippingEnabled ? shippingOverrideEnabled : false,
            care_warranty_override_enabled: careWarrantyEnabled ? careWarrantyOverrideEnabled : false,
            shipping_rule_id: shippingEnabled ? shippingRuleId || null : null,
            care_warranty_rule_id: careWarrantyEnabled ? careWarrantyRuleId || null : null,
            shipping_title_override: shippingEnabled && shippingOverrideEnabled ? shippingTitleOverride || null : null,
            shipping_body_override: shippingEnabled && shippingOverrideEnabled ? shippingBodyOverride || null : null,
            care_warranty_title_override: careWarrantyEnabled && careWarrantyOverrideEnabled ? careWarrantyTitleOverride || null : null,
            care_warranty_body_override: careWarrantyEnabled && careWarrantyOverrideEnabled ? careWarrantyBodyOverride || null : null,
            features,
          specifications: sanitizeRows(specifications),
          product_details: sanitizeRows(productDetails),
          detail_sections: sanitizeSections(detailSections),
          faq_items: sanitizeFaqItems(faqItems),
          image_1_path: imagePaths[0],
          image_2_path: imagePaths[1],
          image_3_path: imagePaths[2],
          image_4_path: imagePaths[3],
          image_1_alt: imageAlts[0]?.trim() || null,
          image_2_alt: imageAlts[1]?.trim() || null,
          image_3_alt: imageAlts[2]?.trim() || null,
          image_4_alt: imageAlts[3]?.trim() || null,
          video_path: videoPath,
          model_3d_url: model3dUrl.trim() || null,
          show_image_1: showImageSlots[0],
          show_image_2: showImageSlots[1],
          show_image_3: showImageSlots[2],
          show_image_4: showImageSlots[3],
          show_video: showVideo,
          custom_order_enabled: customOrderEnabled,
          ready_to_ship: readyToShip,
          allow_checkout: isCollectionProduct ? false : allowCheckout,
          hiphop_badges: hiphopBadges,
          chain_length_options: chainLengthOptions,
          hiphop_carat_label: hiphopCaratLabel || null,
          hiphop_carat_values: hiphopCaratValues,
          gram_weight_label: gramWeightLabel || null,
          gram_weight_value: gramWeightValue || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to save product.')
      }

      toast({
        title: productId || productSlug ? 'Product updated' : 'Product created',
        description: productId || productSlug
          ? 'The product changes were saved successfully.'
          : 'The new product was created successfully.',
      })

      shouldRedirect = true
      setRedirecting(true)
      window.setTimeout(() => {
        router.push(backHref)
      }, 700)
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save product.',
        variant: 'destructive',
      })
      setRedirecting(false)
    } finally {
      if (!shouldRedirect) {
        setSaving(false)
      }
    }
  }

  if (loading) {
    return <ProductFormSkeleton />
  }

  return (
    <>
    <div className="flex flex-col gap-10">
      {redirecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-white px-8 py-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Redirecting to products</p>
                <p className="mt-1 text-xs text-muted-foreground">Please wait while the updated product list loads.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Link href={backHref} className="rounded p-1.5 hover:bg-secondary transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {pageTitle || (productId || productSlug ? 'Edit Product' : 'Create Product')}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {pageDescription || (productId || productSlug ? 'Update the saved product model and storefront details.' : 'Add a new jewelry product to inventory.')}
          </p>
        </div>
      </div>

      {!productId && !productSlug ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={applyTestData}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            Autofill Test Data
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="max-w-5xl space-y-8">
        <ProductFormStepBar
          steps={PRODUCT_FORM_STEPS}
          activeStep={activeStep}
          onStepChange={setActiveStep}
        />

        {activeStep === 'basics' ? (
          <>
            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-8 text-xl font-bold text-foreground">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Product Name *">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} />
                </FormField>
                <FormField label="SKU *">
                  <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClassName} />
                </FormField>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input id="featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="rounded border-border" />
                <label htmlFor="featured" className="text-sm font-medium text-foreground">Featured Product</label>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-8 text-xl font-bold text-foreground">Category and Classification</h2>
              <div className="space-y-6">
                <FormField label="Main Category">
                  <Select
                    value={mainCategoryId}
                    onValueChange={(value) => {
                      setMainCategoryId(value)
                      setSubcategoryId('')
                      setOptionId('')
                      setLinkedSubcategoryIds([])
                      setLinkedOptionIds([])
                    }}
                    disabled={forceHipHopCategory || isLockedLaneProduct}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                {isLockedLaneProduct ? (
                  <p className="text-xs text-muted-foreground">
                    {isCollectionProduct
                      ? 'Main category is locked for Collection products.'
                      : 'Main category is locked for Hip Hop products.'}
                  </p>
                ) : null}

                {categorySubcategories.length > 0 ? (
                  <FormField label="Subcategory">
                    <Select
                      value={subcategoryId}
                      onValueChange={(value) => {
                        setSubcategoryId(value)
                        setOptionId('')
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorySubcategories.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : null}

                {linkedSubcategoryCandidates.length > 0 ? (
                  <TogglePillGroup
                    label="Linked Subcategories"
                    items={linkedSubcategoryCandidates.map((item) => ({
                      id: item.id,
                      label: item.name,
                    }))}
                    selected={linkedSubcategoryIds}
                    onToggle={(value) => setLinkedSubcategoryIds((prev) => toggleInArray(prev, value))}
                  />
                ) : null}

                {subcategoryId ? (
                  <FormField label="Option">
                    <Select value={optionId} onValueChange={setOptionId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategoryOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                ) : null}

                {linkedOptionCandidates.length > 0 ? (
                  <TogglePillGroup
                    label="Linked Options"
                    items={linkedOptionCandidates.map((item) => ({
                      id: item.id,
                      label: item.name,
                    }))}
                    selected={linkedOptionIds}
                    onToggle={(value) => setLinkedOptionIds((prev) => toggleInArray(prev, value))}
                  />
                ) : null}

                <FormField label="Style">
                  <Select value={styleId || '__none__'} onValueChange={(value) => setStyleId(value === '__none__' ? '' : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No style</SelectItem>
                      {styles.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="rounded-lg border border-border bg-secondary/20 px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">Selected Path</p>
                  <p className="mt-3 text-xs text-muted-foreground">{selectedPath}</p>
                </div>
              </div>
            </section>

            {isHiphopProduct ? (
              <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
                <div className="border-l-2 border-foreground/20 pl-4">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hip Hop Options</p>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Hip Hop Checkout</h2>
                      <p className="mt-2 text-xs text-muted-foreground">Allow this Hip Hop product to go directly to checkout from the product page.</p>
                    </div>
                    <PillToggle value={allowCheckout} onChange={setAllowCheckout} onLabel="Checkout Allowed" offLabel="Checkout Disabled" />
                  </div>
                </div>
              </section>
            ) : null}

            {isCollectionProduct ? (
              <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
                <div className="border-l-2 border-foreground/20 pl-4">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Collection Rules</p>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Checkout</h2>
                      <p className="mt-2 text-xs text-muted-foreground">Collection products stay enquiry-first and never allow checkout.</p>
                    </div>
                    <span className="inline-flex rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">Checkout Disabled</span>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-6 text-lg font-semibold text-foreground">Product Experience</h2>
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-secondary/10 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Product Mode</p>
                    <p className="mt-2 text-xs text-muted-foreground">This form mode is set by the admin section you entered from, so the product stays in its correct lane.</p>
                  </div>
                  {forcedLane ? (
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                      forcedLane === 'hiphop'
                        ? 'bg-foreground text-white'
                        : forcedLane === 'collection'
                          ? 'bg-secondary text-foreground'
                          : 'bg-white border border-border text-foreground'
                    }`}>
                      {forcedLane === 'hiphop' ? 'Hip Hop' : forcedLane === 'collection' ? 'Collection' : 'Standard'}
                    </span>
                  ) : (
                    <PillToggle
                      value={detailTemplate === 'hiphop'}
                      onChange={(next) => setDetailTemplate(next ? 'hiphop' : 'standard')}
                      onLabel="Hip Hop"
                      offLabel="Standard"
                    />
                  )}
                </div>

                {isHiphopProduct ? (
                  <div className="space-y-6 border-l-2 border-foreground/20 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hip Hop Options</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-border bg-secondary/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Ready To Ship</p>
                            <p className="mt-2 text-xs text-muted-foreground">Show the in-stock premium badge on the Hip Hop detail page.</p>
                          </div>
                          <PillToggle value={readyToShip} onChange={setReadyToShip} onLabel="Enabled" offLabel="Disabled" />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-secondary/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Custom Order</p>
                            <p className="mt-2 text-xs text-muted-foreground">Show the bespoke / custom-order CTA emphasis for Hip Hop products.</p>
                          </div>
                          <PillToggle value={customOrderEnabled} onChange={setCustomOrderEnabled} onLabel="Enabled" offLabel="Disabled" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-semibold text-foreground">Hip Hop Badges</label>
                      <div className="flex gap-2">
                        <input
                          value={hiphopBadgeInput}
                          onChange={(e) => setHiphopBadgeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addHiphopBadge()
                            }
                          }}
                          placeholder="Add badge like Bespoke, Ready to Ship, Full Iced..."
                          className={`${inputClassName} flex-1`}
                        />
                        <button type="button" onClick={addHiphopBadge} className={secondaryButtonClassName}>Add</button>
                      </div>
                      <TagList items={hiphopBadges} onRemove={(value) => setHiphopBadges((prev) => prev.filter((item) => item !== value))} />
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-semibold text-foreground">Chain / Length Options</label>
                      <div className="flex gap-2">
                        <input
                          value={chainLengthInput}
                          onChange={(e) => setChainLengthInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addChainLengthOption()
                            }
                          }}
                          placeholder='Add chain length like 18", 20", 22"...'
                          className={`${inputClassName} flex-1`}
                        />
                        <button type="button" onClick={addChainLengthOption} className={secondaryButtonClassName}>Add</button>
                      </div>
                      <TagList items={chainLengthOptions} onRemove={(value) => setChainLengthOptions((prev) => prev.filter((item) => item !== value))} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Carat Label">
                        <input value={hiphopCaratLabel} onChange={(e) => setHiphopCaratLabel(e.target.value)} placeholder="Diamond Carat" className={inputClassName} />
                      </FormField>
                      <FormField label="Gram Weight Label">
                        <input value={gramWeightLabel} onChange={(e) => setGramWeightLabel(e.target.value)} placeholder="Gram Weight" className={inputClassName} />
                      </FormField>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-semibold text-foreground">Carat Values</label>
                      <div className="flex gap-2">
                        <input
                          value={hiphopCaratInput}
                          onChange={(e) => setHiphopCaratInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addHiphopCaratValue()
                            }
                          }}
                          placeholder="Add carat like 0.5 ct, 1.0 ct, 4.0 ct+"
                          className={`${inputClassName} flex-1`}
                        />
                        <button type="button" onClick={addHiphopCaratValue} className={secondaryButtonClassName}>Add</button>
                      </div>
                      <TagList items={hiphopCaratValues} onRemove={(value) => setHiphopCaratValues((prev) => prev.filter((item) => item !== value))} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Gram Weight Value">
                        <input value={gramWeightValue} onChange={(e) => setGramWeightValue(e.target.value)} placeholder="148 g" className={inputClassName} />
                      </FormField>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {activeStep === 'pricing' ? (
          <>
            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-8 text-xl font-bold text-foreground">Pricing</h2>
              <div className="mb-8 rounded-lg border border-border bg-secondary/10 p-4">
                <TogglePillGroup
                  label="Metal Options"
                  items={combinedMetalOptions.map((item) => ({ id: item.id, label: buildCombinedMetalDisplayLabel(item) }))}
                  selected={selectedMetalIds}
                  onToggle={(value) => setSelectedMetalIds((prev) => toggleInArray(prev, value))}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Pick the sellable combined metal options here first. The prices and media blocks below will follow the same selection.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FormField label="Base Price *">
                  <div className="rounded-lg border border-border bg-secondary/10 px-4 py-3 text-sm text-foreground">
                    {defaultMetalVariant ? (
                      <div>
                        <p className="font-semibold">{getMetalVariantLabel(defaultMetalVariant.metal_id)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Number(defaultMetalVariant.price || 0).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    ) : selectedBasePriceEntry ? (
                      <div>
                        <p className="font-semibold">Legacy base price</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Number(selectedBasePriceEntry.price || 0).toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Add at least one metal option first.</span>
                    )}
                  </div>
                </FormField>
                <FormField label="Discount Price">
                  <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className={inputClassName} />
                </FormField>
                <FormField label="GST Slab">
                  <Select value={gstSlabId || '__none__'} onValueChange={(value) => setGstSlabId(value === '__none__' ? '' : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select GST slab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No GST slab</SelectItem>
                      {gstSlabs
                        .filter((item) => item.status !== 'hidden')
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.percentage}%)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Stock Quantity">
                  <input type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className={inputClassName} />
                </FormField>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Base price follows the default metal option shown below.
              </p>
            </section>

            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Metal Options</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Each selected metal option gets its own price. Mark one as default and that option will control the storefront price first.
                  </p>
                </div>
              </div>
              {metalVariants.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {metalVariants.map((entry, index) => {
                      const isDefault = entry.is_default
                      return (
                        <div key={`${entry.metal_id}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                          <div className="rounded-lg border border-border bg-secondary/10 px-4 py-3 text-sm font-semibold text-foreground">
                            {getMetalVariantLabel(entry.metal_id)}
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={String(entry.price ?? '')}
                            onChange={(e) =>
                              setMetalVariants((prev) =>
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, price: Number(e.target.value || 0) } : row
                                )
                              )
                            }
                            className={inputClassName}
                            placeholder="Price"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDefault ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {isDefault ? 'Default Variant' : `Variant ${index + 1}`}
                            </span>
                            <button type="button" onClick={() => setDefaultMetalVariant(entry.metal_id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
                              {isDefault ? 'Default' : 'Make Default'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  Select at least one combined metal option above first.
                </div>
              )}
            </section>
          </>
        ) : null}

        {activeStep === 'attributes' ? (
          <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <h2 className="mb-8 text-xl font-bold text-foreground">Attributes and Filters</h2>
            <div className="space-y-6">
            {certificates.length > 0 ? (
              <TogglePillGroup
                label="Certificates"
                items={certificates.map((item) => ({ id: item.id, label: item.name }))}
                selected={selectedCertificateIds}
                onToggle={(value) => setSelectedCertificateIds((prev) => toggleInArray(prev, value))}
              />
            ) : null}

            {ringCategories.length > 0 ? (
                <div className="rounded-lg border border-border bg-secondary/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                    <p className="text-sm font-semibold text-foreground">Ring Category</p>
                  <p className="mt-2 text-xs text-muted-foreground">Enable this only for products that need ring size selection and pick the default ring category.</p>
                    </div>
                    <PillToggle
                     value={ringSizesEnabled}
                      onChange={(next) => {
                       setRingSizesEnabled(next)
                        if (!next) setRingCategoryId('')
                      }}
                      onLabel="Enabled"
                      offLabel="Disabled"
                    />
                  </div>
  
                 {ringSizesEnabled ? (
                    <div className="mt-4">
                      <FormField label="Default Ring Category">
                        <Select value={ringCategoryId || undefined} onValueChange={setRingCategoryId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select ring category" />
                          </SelectTrigger>
                          <SelectContent>
                            {ringCategories.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      {ringCategoryId ? (
                        <div className="mt-4">
                          <label className="mb-3 block text-sm font-semibold text-foreground">Sizes In This Category</label>
                          <div className="flex flex-wrap gap-2">
                            {ringCategorySizes
                              .filter((item) => item.ring_category_id === ringCategoryId && item.status === 'active')
                              .sort((left, right) => left.display_order - right.display_order)
                              .map((item) => (
                                <span key={item.id} className="rounded-full border border-border px-3 py-2 text-sm text-foreground">
                                  {item.size_label}
                                </span>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
            ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Generic Stone / Material Label">
                  <input value={gemstoneLabel} onChange={(e) => setGemstoneLabel(e.target.value)} placeholder="Stone Type, Material, Gemstone..." className={inputClassName} />
                </FormField>
              <FormField label="Generic Stone / Material Values" className="sm:col-span-2">
                {materialValues.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {materialValues.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSelectedMaterialValueIds((prev) => {
                              const base = prev.length > 0 ? prev : effectiveSelectedMaterialValueIds
                              return toggleInArray(base, item.id)
                            })
                          }
                          className={`rounded px-3 py-2 text-sm font-medium transition-colors ${effectiveSelectedMaterialValueIds.includes(item.id) ? 'bg-primary text-white' : 'border border-border hover:bg-secondary'}`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Select the material values this product should expose on the storefront.</p>
                  </>
                ) : (
                  <div className="rounded border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    No material values found in the master table yet. Add them in the database first, then they will appear here.
                  </div>
                )}
                </FormField>
              </div>

              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Stone Shape Selector</p>
                    <p className="mt-2 text-xs text-muted-foreground">Enable only when this product should expose shape selection and shape-based filtering.</p>
                  </div>
                  <PillToggle
                    value={shapesEnabled}
                    onChange={(next) => {
                      setShapesEnabled(next)
                      if (!next) {
                        setSelectedShapeIds([])
                      }
                    }}
                    onLabel="Enabled"
                    offLabel="Disabled"
                  />
                </div>

                {shapesEnabled ? (
                  <div className="mt-4">
                    <TogglePillGroup
                      label="Available Shapes"
                      items={stoneShapes.map((shape) => ({ id: shape.id, label: shape.name }))}
                      selected={selectedShapeIds}
                      onToggle={(value) => setSelectedShapeIds((prev) => toggleInArray(prev, value))}
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      These selected master shapes will be used for the product page selector, listing filters, and shape-aware navigation.
                    </p>
                  </div>
                ) : null}
              </div>

            <div className="rounded-lg border border-border bg-secondary/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Fit</p>
                  <p className="mt-2 text-xs text-muted-foreground">Use this for wear-style options like Comfort Fit, Screw Back, or Chain Length choices.</p>
                </div>
                <PillToggle
                  value={fitEnabled}
                  onChange={(next) => {
                    setFitEnabled(next)
                    if (!next) {
                      setFitOptions([])
                      setFitLabel('Fit')
                    }
                  }}
                  onLabel="Enabled"
                  offLabel="Disabled"
                />
              </div>

              {fitEnabled ? (
                <div className="mt-4 space-y-4">
                  <FormField label="Fit Label">
                    <input value={fitLabel} onChange={(e) => setFitLabel(e.target.value)} placeholder="Fit, Backing, Chain Length..." className={inputClassName} />
                  </FormField>
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-foreground">Fit Options</label>
                    <div className="flex gap-2">
                      <input
                        value={fitInput}
                        onChange={(e) => setFitInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addFitOption()
                          }
                        }}
                        placeholder="Add fit option like Comfort Fit or Screw Back"
                        className={`${inputClassName} flex-1`}
                      />
                      <button type="button" onClick={addFitOption} className={secondaryButtonClassName}>Add</button>
                    </div>
                    <TagList items={fitOptions} onRemove={(value) => setFitOptions((prev) => prev.filter((item) => item !== value))} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-border bg-secondary/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Engraving</p>
                  <p className="mt-2 text-xs text-muted-foreground">Control whether this product offers engraving on the storefront.</p>
                </div>
                <PillToggle value={engravingEnabled} onChange={setEngravingEnabled} onLabel="Enabled" offLabel="Disabled" />
              </div>
              {engravingEnabled ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">Engraving Label</label>
                  <input value={engravingLabel} onChange={(e) => setEngravingLabel(e.target.value)} className={inputClassName} />
                </div>
              ) : null}
            </div>
          </div>
          </section>
        ) : null}

        {activeStep === 'content' ? (
          <>
            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-8 text-xl font-bold text-foreground">Content</h2>
              <div className="space-y-4">
                <FormField label="Description">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClassName} />
                </FormField>
                <FormField label="Tag Line">
                  <input value={tagLine} onChange={(e) => setTagLine(e.target.value)} className={inputClassName} />
                </FormField>
                <div className="rounded-lg border border-border bg-secondary/10 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground">Optional SEO Fields</p>
                    <p className="mt-1 text-xs text-muted-foreground">Leave blank to use the automatic product name and description metadata.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FormField label="SEO Title">
                      <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClassName} placeholder="Custom Google title" />
                    </FormField>
                    <FormField label="On-page H1 Title">
                      <input value={h1Title} onChange={(e) => setH1Title(e.target.value)} className={inputClassName} placeholder="Optional display title" />
                    </FormField>
                    <div className="lg:col-span-2">
                      <FormField label="SEO Meta Description">
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className={inputClassName} placeholder="Custom Google description, ideally around 150-160 characters." />
                      </FormField>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Highlights</label>
                  <div className="flex gap-2">
                    <input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFeature()
                        }
                      }}
                      className={`${inputClassName} flex-1`}
                    />
                    <button type="button" onClick={addFeature} className={secondaryButtonClassName}>Add</button>
                  </div>
                  <TagList items={features} onRemove={(value) => setFeatures((prev) => prev.filter((item) => item !== value))} />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <h2 className="mb-8 text-xl font-bold text-foreground">Store Policies</h2>
              <div className="space-y-6">
                  <PolicyEditor
                    title="Shipping"
                    description="Select a reusable shipping rule and optionally override it for this product."
                    enabled={shippingEnabled}
                    onEnabledChange={(next) => {
                      setShippingEnabled(next)
                      if (!next) {
                        setShippingOverrideEnabled(false)
                        setShippingRuleId('')
                        setShippingTitleOverride('')
                        setShippingBodyOverride('')
                    }
                  }}
                    rules={shippingRules}
                    selectedRuleId={shippingRuleId}
                    onRuleChange={setShippingRuleId}
                    overrideEnabled={shippingOverrideEnabled}
                    onOverrideEnabledChange={(next) => {
                      setShippingOverrideEnabled(next)
                      if (!next) {
                        setShippingTitleOverride('')
                        setShippingBodyOverride('')
                      }
                    }}
                    titleOverride={shippingTitleOverride}
                    onTitleOverrideChange={setShippingTitleOverride}
                    bodyOverride={shippingBodyOverride}
                  onBodyOverrideChange={setShippingBodyOverride}
                />

                  <PolicyEditor
                    title="Care & Warranty"
                    description="Select a reusable care rule and optionally override it for this product."
                    enabled={careWarrantyEnabled}
                    onEnabledChange={(next) => {
                      setCareWarrantyEnabled(next)
                      if (!next) {
                        setCareWarrantyOverrideEnabled(false)
                        setCareWarrantyRuleId('')
                        setCareWarrantyTitleOverride('')
                        setCareWarrantyBodyOverride('')
                    }
                  }}
                    rules={careWarrantyRules}
                    selectedRuleId={careWarrantyRuleId}
                    onRuleChange={setCareWarrantyRuleId}
                    overrideEnabled={careWarrantyOverrideEnabled}
                    onOverrideEnabledChange={(next) => {
                      setCareWarrantyOverrideEnabled(next)
                      if (!next) {
                        setCareWarrantyTitleOverride('')
                        setCareWarrantyBodyOverride('')
                      }
                    }}
                    titleOverride={careWarrantyTitleOverride}
                    onTitleOverrideChange={setCareWarrantyTitleOverride}
                    bodyOverride={careWarrantyBodyOverride}
                  onBodyOverrideChange={setCareWarrantyBodyOverride}
                />
              </div>
            </section>
          </>
        ) : null}

        {activeStep === 'details' ? (
          <>
            <KeyValueSection
              title="Specifications"
              description="Add structured key-value rows for the product detail specifications tab."
              rows={specifications}
              onChange={setSpecifications}
            />

            <KeyValueSection
              title="Product Details"
              description="Use this for general product facts that should render separately from specifications."
              rows={productDetails}
              onChange={setProductDetails}
            />

            <ProductFaqEditor
              items={faqItems}
              onChange={setFaqItems}
              onValidationError={(message) =>
                toast({
                  title: 'FAQ needs both fields',
                  description: message,
                  variant: 'destructive',
                })
              }
            />
            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Additional Detail Sections</h2>
                  <p className="mt-2 text-xs text-muted-foreground">Create dynamic sections like Diamond Details, Gemstone Details, or Material Details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailSections((prev) => [...prev, emptySection()])}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  <Plus size={14} />
                  Add Section
                </button>
              </div>

              <div className="space-y-4">
                {detailSections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-lg border border-border bg-secondary/10 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <FormField label="Section Title">
                        <input
                          value={section.title}
                          onChange={(e) =>
                            setDetailSections((prev) =>
                              prev.map((entry, index) => (index === sectionIndex ? { ...entry, title: e.target.value } : entry))
                            )
                          }
                          className={inputClassName}
                        />
                      </FormField>
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={section.visible}
                          onChange={(e) =>
                            setDetailSections((prev) =>
                              prev.map((entry, index) => (index === sectionIndex ? { ...entry, visible: e.target.checked } : entry))
                            )
                          }
                          className="rounded border-border"
                        />
                        Visible
                      </label>
                      <button
                        type="button"
                        onClick={() => setDetailSections((prev) => prev.filter((_, index) => index !== sectionIndex))}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.rows.map((row, rowIndex) => (
                        <div key={`${section.id}-${rowIndex}`} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <input
                            value={row.key}
                            onChange={(e) =>
                              setDetailSections((prev) =>
                                prev.map((entry, index) =>
                                  index === sectionIndex
                                    ? {
                                        ...entry,
                                        rows: entry.rows.map((sectionRow, sectionRowIndex) =>
                                          sectionRowIndex === rowIndex ? { ...sectionRow, key: e.target.value } : sectionRow
                                        ),
                                      }
                                    : entry
                                )
                              )
                            }
                            placeholder="Label"
                            className={inputClassName}
                          />
                          <input
                            value={row.value}
                            onChange={(e) =>
                              setDetailSections((prev) =>
                                prev.map((entry, index) =>
                                  index === sectionIndex
                                    ? {
                                        ...entry,
                                        rows: entry.rows.map((sectionRow, sectionRowIndex) =>
                                          sectionRowIndex === rowIndex ? { ...sectionRow, value: e.target.value } : sectionRow
                                        ),
                                      }
                                    : entry
                                )
                              )
                            }
                            placeholder="Value"
                            className={inputClassName}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDetailSections((prev) =>
                                prev.map((entry, index) =>
                                  index === sectionIndex
                                    ? {
                                        ...entry,
                                        rows: entry.rows.length > 1 ? entry.rows.filter((_, sectionRowIndex) => sectionRowIndex !== rowIndex) : entry.rows,
                                      }
                                    : entry
                                )
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDetailSections((prev) =>
                          prev.map((entry, index) => (index === sectionIndex ? { ...entry, rows: [...entry.rows, emptyRow()] } : entry))
                        )
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                      <Plus size={14} />
                      Add Row
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeStep === 'media' ? (
          <>
            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Media</h2>
                  <p className="mt-2 text-xs text-muted-foreground">Upload storefront media and do a final review before saving.</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{selectedPath}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isHiphopProduct ? 'Hip Hop presentation is active for this product.' : 'Standard product presentation is active.'}
                  </p>
                </div>
              </div>

                <div className="mt-6">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-foreground">Base Image Carousel</p>
                    <p className="mt-1 text-xs text-muted-foreground">Shared fallback media when a metal variant does not have its own images.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['Image 1', 'Image 2', 'Image 3', 'Image 4'].map((label, index) => (
                      <MediaThumbnailSlot
                        key={label}
                        inputId={`base-media-${index}`}
                        label={label}
                        path={imagePaths[index]}
                        visible={showImageSlots[index]}
                        uploading={Boolean(uploadingSlots[`base-image-${index}`])}
                        onVisibleChange={(next) => setShowImageSlots((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? next : entry)))}
                        onClear={() => {
                          setImageSlots((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? '' : entry)))
                          setImagePaths((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? null : entry)))
                          setImageAlts((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? '' : entry)))
                        }}
                        onUpload={async (file) => {
                          setUploadingSlots((prev) => ({ ...prev, [`base-image-${index}`]: true }))
                          try {
                            const path = await uploadMedia(file, 'image', isHiphopProduct ? 'hiphop' : 'products')
                            setImageSlots((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? path : entry)))
                            setImagePaths((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? path : entry)))
                            toast({ title: 'Uploaded', description: `${label} uploaded successfully.` })
                          } catch (error) {
                            toast({
                              title: 'Upload failed',
                              description: error instanceof Error ? error.message : `Unable to upload ${label.toLowerCase()}.`,
                              variant: 'destructive',
                            })
                          } finally {
                            setUploadingSlots((prev) => ({ ...prev, [`base-image-${index}`]: false }))
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {['Image 1 Alt Text', 'Image 2 Alt Text', 'Image 3 Alt Text', 'Image 4 Alt Text'].map((label, index) => (
                      <FormField key={label} label={label}>
                        <input
                          value={imageAlts[index] ?? ''}
                          onChange={(event) => setImageAlts((prev) => prev.map((entry, slotIndex) => (slotIndex === index ? event.target.value : entry)))}
                          className={inputClassName}
                          placeholder="Optional image description for SEO/accessibility"
                        />
                      </FormField>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <MediaVideoUrlRow
                    value={videoPath ?? ''}
                    label="Legacy Shared Video URL"
                    onChange={(nextValue) => {
                      const trimmed = nextValue.trim()
                      setVideoPath(trimmed || null)
                    }}
                  />
                </div>

                <div className="mt-4">
                  <MediaVideoUrlRow
                    value={model3dUrl}
                    label="3D Model GLB URL"
                    helperText="Paste the Cloudflare/R2 direct .glb URL. This keeps images and video unchanged and adds an optional interactive 3D viewer on product details."
                    onChange={setModel3dUrl}
                  />
                </div>

              <div className="mt-6 rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Combined Option Media</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Manage the repeatable image and video items for the default fallback block and for each combined metal / purity option. Storefront will use the selected option media first, then fall back to the default block if needed.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVariantMediaKey('default')
                      setActiveVariantMediaIndex(null)
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                      activeVariantMediaKey === 'default'
                        ? 'border-foreground bg-foreground text-white'
                        : 'border-border bg-white text-foreground hover:bg-secondary'
                    }`}
                  >
                    Default Fallback
                  </button>
                  {metalVariants.map((entry) => (
                    <button
                      key={entry.metal_id}
                      type="button"
                      onClick={() => {
                        setActiveVariantMediaKey(entry.metal_id)
                        setActiveVariantMediaIndex(null)
                      }}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                        activeVariantMediaKey === entry.metal_id
                          ? 'border-foreground bg-foreground text-white'
                          : 'border-border bg-white text-foreground hover:bg-secondary'
                      }`}
                    >
                      {getMetalVariantLabel(entry.metal_id)}
                    </button>
                  ))}
                </div>

                {(() => {
                  const isDefaultFallback = activeVariantMediaKey === 'default'
                  const items = isDefaultFallback ? defaultVariantMediaItems : getVariantMediaItems(activeVariantMediaKey)
                  const sectionLabel = isDefaultFallback ? 'Default Fallback' : getMetalVariantLabel(activeVariantMediaKey)
                  const activeItem = activeVariantMediaIndex == null ? null : items[activeVariantMediaIndex] ?? null

                  return (
                    <div className="mt-5 rounded-lg border border-border/70 bg-white p-5">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-foreground">{sectionLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isDefaultFallback
                            ? 'This media shows when a combined option does not have its own media.'
                            : 'This media is shown when the shopper selects this combined option.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {items.map((item, itemIndex) => {
                          const isActive = activeVariantMediaIndex === itemIndex
                          const previewPath = item.media_type === 'image' ? toStoragePreviewUrl(item.media_path) : ''
                          const uploadKey = `variant-media-${activeVariantMediaKey}-${itemIndex}`
                          const inputId = `variant-media-upload-${activeVariantMediaKey}-${itemIndex}`
                          const isUploading = Boolean(uploadingSlots[uploadKey])
                          return (
                            <div
                              key={`variant-media-thumb-${activeVariantMediaKey}-${itemIndex}`}
                              className={`group relative h-24 w-24 overflow-hidden rounded-xl border transition-colors ${
                                isActive ? 'border-foreground ring-1 ring-foreground' : 'border-border hover:border-primary'
                              }`}
                            >
                              <label
                                htmlFor={inputId}
                                onClick={() => setActiveVariantMediaIndex(itemIndex)}
                                className="block h-full w-full cursor-pointer"
                                title={`Upload ${item.media_type}`}
                              >
                                {item.media_type === 'image' && previewPath ? (
                                  <img src={previewPath} alt={`${sectionLabel} item ${itemIndex + 1}`} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center bg-secondary/20 px-2 text-center">
                                    <Plus size={16} className="mb-2 text-muted-foreground" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      {item.media_type}
                                    </span>
                                    <span className="mt-1 text-[11px] text-foreground">
                                      {item.media_path ? 'Change file' : 'Upload'}
                                    </span>
                                  </div>
                                )}
                              </label>
                              <input
                                id={inputId}
                                type="file"
                                accept={item.media_type === 'video' ? 'video/*' : 'image/*'}
                                className="hidden"
                                onChange={async (event) => {
                                  const input = event.currentTarget
                                  const file = input.files?.[0]
                                  if (!file) return
                                  setActiveVariantMediaIndex(itemIndex)
                                  setUploadingSlots((prev) => ({ ...prev, [uploadKey]: true }))
                                  try {
                                    const uploadedPath = await uploadMedia(
                                      file,
                                      item.media_type === 'video' ? 'video' : 'image',
                                      isHiphopProduct ? 'hiphop' : 'products'
                                    )
                                    updateVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey, itemIndex, (entry) => ({
                                      ...entry,
                                      media_path: uploadedPath,
                                    }))
                                    toast({
                                      title: 'Uploaded',
                                      description: `${sectionLabel} ${item.media_type} uploaded successfully.`,
                                    })
                                  } catch (error) {
                                    toast({
                                      title: 'Upload failed',
                                      description: error instanceof Error ? error.message : `Unable to upload ${item.media_type}.`,
                                      variant: 'destructive',
                                    })
                                  } finally {
                                    setUploadingSlots((prev) => ({ ...prev, [uploadKey]: false }))
                                    input.value = ''
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setActiveVariantMediaIndex(itemIndex)
                                  setDeleteVariantMediaTarget({
                                    metalId: isDefaultFallback ? null : activeVariantMediaKey,
                                    itemIndex,
                                    label: `${sectionLabel} media ${itemIndex + 1}`,
                                  })
                                }}
                                className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
                                aria-label={`Delete ${sectionLabel} media ${itemIndex + 1}`}
                              >
                                <Trash2 size={14} />
                              </button>
                              {isUploading ? (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 text-foreground">
                                  <div className="flex flex-col items-center gap-1">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Uploading</span>
                                  </div>
                                </div>
                              ) : null}
                              <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                {itemIndex + 1}
                              </div>
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => addVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey)}
                          className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                        >
                          <Plus size={18} />
                          <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">Add</span>
                        </button>
                      </div>

                      {activeItem ? (
                        <div className="mt-5 rounded-lg border border-border bg-secondary/10 p-4">
                          {(() => {
                            const itemIndex = activeVariantMediaIndex ?? 0
                            const uploadKey = `variant-media-${activeVariantMediaKey}-${itemIndex}`
                            return (
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {sectionLabel} media {itemIndex + 1}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Upload a file or paste a public URL for this selected thumbnail.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteVariantMediaTarget({
                                        metalId: isDefaultFallback ? null : activeVariantMediaKey,
                                        itemIndex,
                                        label: `${sectionLabel} media ${itemIndex + 1}`,
                                      })
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                                  >
                                    {Boolean(uploadingSlots[uploadKey]) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Remove
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_minmax(0,1fr)_auto]">
                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      Media Type
                                    </label>
                                    <Select
                                      value={activeItem.media_type}
                                      onValueChange={(value) =>
                                        updateVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey, itemIndex, (entry) => ({
                                          ...entry,
                                          media_type: value === 'video' ? 'video' : 'image',
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      Media Path / URL
                                    </label>
                                    <input
                                      value={activeItem.media_path}
                                      onChange={(e) =>
                                        updateVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey, itemIndex, (entry) => ({
                                          ...entry,
                                          media_path: e.target.value,
                                        }))
                                      }
                                      placeholder={activeItem.media_type === 'video' ? 'https://...' : 'products/... or https://...'}
                                      className={inputClassName}
                                    />
                                    {activeItem.media_path ? (
                                      <p className="mt-2 break-all text-[11px] text-muted-foreground">{activeItem.media_path}</p>
                                    ) : null}
                                  </div>

                                  <div className="xl:col-span-3">
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      Alt Text
                                    </label>
                                    <input
                                      value={activeItem.alt_text ?? ''}
                                      onChange={(e) =>
                                        updateVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey, itemIndex, (entry) => ({
                                          ...entry,
                                          alt_text: e.target.value,
                                        }))
                                      }
                                      placeholder="Optional media description for SEO/accessibility"
                                      className={inputClassName}
                                    />
                                  </div>

                                  <div className="flex items-end justify-end gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                                      <Plus size={14} />
                                      Upload
                                      <input
                                        type="file"
                                        accept={activeItem.media_type === 'video' ? 'video/*' : 'image/*'}
                                        className="hidden"
                                        onChange={async (event) => {
                                          const input = event.currentTarget
                                          const file = input.files?.[0]
                                          if (!file) return
                                          setUploadingSlots((prev) => ({ ...prev, [uploadKey]: true }))
                                          try {
                                            const uploadedPath = await uploadMedia(
                                              file,
                                              activeItem.media_type === 'video' ? 'video' : 'image',
                                              isHiphopProduct ? 'hiphop' : 'products'
                                            )
                                            updateVariantMediaItem(isDefaultFallback ? null : activeVariantMediaKey, itemIndex, (entry) => ({
                                              ...entry,
                                              media_path: uploadedPath,
                                            }))
                                            toast({
                                              title: 'Uploaded',
                                              description: `${sectionLabel} ${activeItem.media_type} uploaded successfully.`,
                                            })
                                          } catch (error) {
                                            toast({
                                              title: 'Upload failed',
                                              description: error instanceof Error ? error.message : `Unable to upload ${activeItem.media_type}.`,
                                              variant: 'destructive',
                                            })
                                          } finally {
                                            setUploadingSlots((prev) => ({ ...prev, [uploadKey]: false }))
                                            if (input) input.value = ''
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                          No media items added yet for this block. Click the <span className="font-semibold text-foreground">Add</span> tile to create the first thumbnail.
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {(selectedMetalIds.length > 0 || metalMedia.length > 0) ? (
                <div className="mt-6 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  Legacy metal-specific media remains stored in the background for older products, but new work should use the <span className="font-semibold text-foreground">Combined Option Media</span> block above.
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        <ProductFormStepActions
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          saving={saving}
          backHref={backHref}
          submitLabel={productId || productSlug ? 'Update Product' : 'Create Product'}
          onPrevious={() => setActiveStep(PRODUCT_FORM_STEPS[Math.max(0, activeStepIndex - 1)].id)}
          onNext={() => setActiveStep(PRODUCT_FORM_STEPS[Math.min(PRODUCT_FORM_STEPS.length - 1, activeStepIndex + 1)].id)}
        />
      </form>
    </div>
    <ConfirmDialog
      isOpen={Boolean(deleteVariantMediaTarget)}
      title="Delete media block?"
      description={`Are you sure you want to delete "${deleteVariantMediaTarget?.label ?? 'this media block'}"?`}
      confirmText="Delete"
      type="delete"
      onConfirm={() => {
        if (!deleteVariantMediaTarget) return
        removeVariantMediaItem(deleteVariantMediaTarget.metalId, deleteVariantMediaTarget.itemIndex)
        setDeleteVariantMediaTarget(null)
      }}
      onCancel={() => setDeleteVariantMediaTarget(null)}
    />
    </>
  )
}

function FormField({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (value: string) => void }) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item} className="inline-flex items-center gap-2 rounded bg-secondary px-3 py-1 text-sm">
          <span>{item}</span>
          <button type="button" onClick={() => onRemove(item)} className="hover:text-destructive">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function ProductFormSkeleton() {
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-80 max-w-[70vw]" />
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-72 max-w-[70vw]" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[58px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-3 w-64 max-w-[70vw]" />
      </section>

      <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <Skeleton className="mb-8 h-6 w-44" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <Skeleton className="mb-8 h-6 w-56" />
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PillToggle({
  value,
  onChange,
  onLabel,
  offLabel,
}: {
  value: boolean
  onChange: (next: boolean) => void
  onLabel: string
  offLabel: string
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-white p-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${value ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-secondary'}`}
      >
        {onLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${!value ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-secondary'}`}
      >
        {offLabel}
      </button>
    </div>
  )
}

function TogglePillGroup({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-3 block text-sm font-semibold text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${selected.includes(item.id) ? 'bg-primary text-white' : 'border border-border hover:bg-secondary'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function MediaThumbnailSlot({
  inputId,
  label,
  path,
  visible,
  uploading = false,
  onVisibleChange,
  onUpload,
  onClear,
}: {
  inputId: string
  label: string
  path: string | null | undefined
  visible: boolean
  uploading?: boolean
  onVisibleChange: (next: boolean) => void
  onUpload: (file: File) => void | Promise<void>
  onClear?: () => void
}) {
  return (
    <div className="group relative h-24 w-24">
      <label htmlFor={inputId} className="block h-full w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-primary">
        {path ? (
          <img src={toStoragePreviewUrl(path)} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-border text-muted-foreground">
            <Plus size={18} />
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-foreground">
            <div className="flex flex-col items-center gap-1">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Uploading</span>
            </div>
          </div>
        ) : null}
      </label>

      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onVisibleChange(!visible)
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-foreground"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        {path && onClear && !uploading ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onClear()
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-foreground"
            aria-label={`Delete ${label}`}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget
          const file = input.files?.[0]
          if (!file) return
          void onUpload(file)
          if (input) input.value = ''
        }}
      />
    </div>
  )
}

function MediaVideoUrlRow({
  value,
  label = 'Video URL',
  helperText = 'Paste the public video URL to be used on the storefront.',
  onChange,
}: {
  value: string
  label?: string
  helperText?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/30 text-foreground">
          <Video size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://..."
              className={inputClassName}
            />
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-border bg-white text-foreground transition-colors hover:border-primary"
                aria-label={`Clear ${label}`}
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClassName =
  'w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'

const secondaryButtonClassName =
  'rounded bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors'
