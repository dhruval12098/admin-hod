'use client'

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Eye, EyeOff, Loader2, Plus, Trash2, Upload, Video, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CatalogCategory,
  CatalogCertificate,
  CatalogGstSlab,
  CatalogMetal,
  CatalogOption,
  CatalogRingCategory,
  CatalogRingCategorySize,
  CatalogStoneShape,
  ProductContentRule,
  CatalogStyle,
  CatalogSubcategory,
  ProductDetailSection,
  ProductKeyValue,
  ProductMetalMedia,
  ProductPurityPrice,
} from '@/lib/product-catalog'
import { formatCategoryPath } from '@/lib/product-catalog'

type BootstrapPayload = {
  categories?: CatalogCategory[]
  subcategories?: CatalogSubcategory[]
  options?: CatalogOption[]
  metals?: CatalogMetal[]
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
    style_id?: string | null
    metal_ids?: string[]
    purity_values?: string[]
    purity_prices?: ProductPurityPrice[]
    default_purity_price_id?: string | null
    metal_media?: ProductMetalMedia[]
    certificate_ids?: string[]
    ring_size_ids?: string[]
    fit_options?: string[]
    fit_label?: string | null
    gemstone_label?: string | null
    gemstone_value?: string | null
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
    image_1_path?: string | null
    image_2_path?: string | null
    image_3_path?: string | null
    image_4_path?: string | null
    video_path?: string | null
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

  setters.setCategories(payload.categories ?? [])
  setters.setSubcategories(payload.subcategories ?? [])
  setters.setOptions(payload.options ?? [])
  setters.setMetals(payload.metals ?? [])
  setters.setStoneShapes(payload.stoneShapes ?? [])
  setters.setGstSlabs(payload.gstSlabs ?? [])
  setters.setRingCategories(payload.ringCategories ?? [])
  setters.setRingCategorySizes(payload.ringCategorySizes ?? [])
  setters.setCertificates(payload.certificates ?? [])
  setters.setStyles(payload.styles ?? [])
  setters.setShippingRules((payload.productContentRules ?? []).filter((item) => item.kind === 'shipping'))
  setters.setCareWarrantyRules((payload.productContentRules ?? []).filter((item) => item.kind === 'care_warranty'))
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
    setMainCategoryId: Dispatch<SetStateAction<string>>
    setSubcategoryId: Dispatch<SetStateAction<string>>
    setOptionId: Dispatch<SetStateAction<string>>
    setStyleId: Dispatch<SetStateAction<string>>
    setSelectedMetalIds: Dispatch<SetStateAction<string[]>>
    setSelectedPurities: Dispatch<SetStateAction<string[]>>
    setPurityPrices: Dispatch<SetStateAction<ProductPurityPrice[]>>
    setDefaultPurityPriceId: Dispatch<SetStateAction<string>>
    setMetalMedia: Dispatch<SetStateAction<ProductMetalMedia[]>>
    setSelectedCertificateIds: Dispatch<SetStateAction<string[]>>
    setRingSizesEnabled: Dispatch<SetStateAction<boolean>>
    setRingCategoryId: Dispatch<SetStateAction<string>>
    setFitLabel: Dispatch<SetStateAction<string>>
    setFitOptions: Dispatch<SetStateAction<string[]>>
    setFitEnabled: Dispatch<SetStateAction<boolean>>
    setGemstoneLabel: Dispatch<SetStateAction<string>>
    setGemstoneValues: Dispatch<SetStateAction<string[]>>
    setShapesEnabled: Dispatch<SetStateAction<boolean>>
    setSelectedShapeIds: Dispatch<SetStateAction<string[]>>
    setShowPurity: Dispatch<SetStateAction<boolean>>
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
    setImagePaths: Dispatch<SetStateAction<(string | null)[]>>
    setImageSlots: Dispatch<SetStateAction<string[]>>
    setVideoPath: Dispatch<SetStateAction<string | null>>
    setVideoFileName: Dispatch<SetStateAction<string>>
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
  setters.setMainCategoryId(item.main_category_id ?? '')
  setters.setSubcategoryId(item.subcategory_id ?? '')
  setters.setOptionId(item.option_id ?? '')
  setters.setStyleId(item.style_id ?? '')
  setters.setSelectedMetalIds(item.metal_ids ?? [])
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
  setters.setShapesEnabled(Boolean(item.shapes_enabled))
  setters.setSelectedShapeIds(item.shape_ids ?? [])
  setters.setShowPurity(item.show_purity ?? true)
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
  setters.setVideoPath(item.video_path ?? null)
  setters.setVideoFileName(item.video_path ?? '')
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

type ProductFormStepId = 'basics' | 'pricing' | 'attributes' | 'content' | 'details' | 'media'

const PRODUCT_FORM_STEPS: { id: ProductFormStepId; label: string; description: string }[] = [
  { id: 'basics', label: 'Basics', description: 'Core info, category, and template setup.' },
  { id: 'pricing', label: 'Pricing', description: 'Base price source, purity pricing, GST, discounts, and stock.' },
  { id: 'attributes', label: 'Attributes', description: 'Metals, filters, sizing, engraving, and storefront options.' },
  { id: 'content', label: 'Content', description: 'Description, highlights, and policy content.' },
  { id: 'details', label: 'Details', description: 'Specifications and detailed content sections.' },
  { id: 'media', label: 'Media', description: 'Images, video, and final review before save.' },
]

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>([])
  const [options, setOptions] = useState<CatalogOption[]>([])
  const [metals, setMetals] = useState<CatalogMetal[]>([])
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
  const [mainCategoryId, setMainCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [optionId, setOptionId] = useState('')
  const [styleId, setStyleId] = useState('')
  const [selectedMetalIds, setSelectedMetalIds] = useState<string[]>([])
  const [selectedPurities, setSelectedPurities] = useState<string[]>([])
  const [purityLabelInput, setPurityLabelInput] = useState('')
  const [purityPriceInput, setPurityPriceInput] = useState('')
  const [purityPrices, setPurityPrices] = useState<ProductPurityPrice[]>([])
  const [defaultPurityPriceId, setDefaultPurityPriceId] = useState('')
  const [metalMedia, setMetalMedia] = useState<ProductMetalMedia[]>([])
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>([])
  const [ringSizesEnabled, setRingSizesEnabled] = useState(false)
  const [ringCategoryId, setRingCategoryId] = useState('')
  const [fitLabel, setFitLabel] = useState('Fit')
  const [fitOptions, setFitOptions] = useState<string[]>([])
  const [fitInput, setFitInput] = useState('')
  const [fitEnabled, setFitEnabled] = useState(false)
  const [gemstoneLabel, setGemstoneLabel] = useState('')
  const [gemstoneValues, setGemstoneValues] = useState<string[]>([])
  const [gemstoneValueInput, setGemstoneValueInput] = useState('')
  const [shapesEnabled, setShapesEnabled] = useState(false)
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([])
  const [showPurity, setShowPurity] = useState(true)
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
  const [imageSlots, setImageSlots] = useState<string[]>(['', '', '', ''])
  const [imagePaths, setImagePaths] = useState<(string | null)[]>([null, null, null, null])
  const [videoFileName, setVideoFileName] = useState('')
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [showImageSlots, setShowImageSlots] = useState([true, true, true, true])
  const [showVideo, setShowVideo] = useState(true)
  const [activeMetalMediaId, setActiveMetalMediaId] = useState('')
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({})
  const [uploadingVideos, setUploadingVideos] = useState<Record<string, boolean>>({})
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
      setMainCategoryId,
      setSubcategoryId,
      setOptionId,
      setStyleId,
      setSelectedMetalIds,
      setSelectedPurities,
      setPurityPrices,
      setDefaultPurityPriceId,
      setMetalMedia,
      setSelectedCertificateIds,
      setRingSizesEnabled,
      setRingCategoryId,
      setFitLabel,
      setFitOptions,
      setFitEnabled,
      setGemstoneLabel,
      setGemstoneValues,
      setShapesEnabled,
      setSelectedShapeIds,
      setShowPurity,
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
      setImagePaths,
      setImageSlots,
      setVideoPath,
      setVideoFileName,
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

  useEffect(() => {
    void loadData()
  }, [productId, productSlug])

  const loadData = async () => {
    setLoading(true)
    try {
      const bootstrapResponse = await authedFetch('/api/catalog/bootstrap')
      const bootstrapPayload = (await bootstrapResponse.json().catch(() => null)) as BootstrapPayload | null
      if (bootstrapResponse.ok && bootstrapPayload) {
        applyBootstrap(bootstrapPayload)
      }

      const productLookupUrl = productSlug ? `/api/products/by-slug/${productSlug}` : productId ? `/api/products/${productId}` : null

      if (productLookupUrl) {
        const productResponse = await authedFetch(productLookupUrl)
        const productPayload = (await productResponse.json().catch(() => null)) as ProductResponse | null
        if (productResponse.ok && productPayload?.item) {
          applyProduct(productPayload.item)
        }
      }
    } finally {
      setLoading(false)
    }
  }

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

  const selectedPath = useMemo(() => {
    const option = options.find((item) => item.id === optionId)
    return formatCategoryPath({ category: mainCategory, subcategory: selectedSubcategory, option }) || 'No category selected'
  }, [mainCategory, selectedSubcategory, optionId, options])

  const selectedBasePriceEntry = useMemo(
    () => purityPrices.find((entry) => entry.id === defaultPurityPriceId) ?? null,
    [defaultPurityPriceId, purityPrices]
  )

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

  useEffect(() => {
    const hasDefault = purityPrices.some((entry) => entry.id === defaultPurityPriceId)
    if (!hasDefault) {
      setDefaultPurityPriceId(purityPrices[0]?.id ?? '')
    }
  }, [defaultPurityPriceId, purityPrices])

  useEffect(() => {
    if (!selectedBasePriceEntry) {
      return
    }

    setBasePrice(String(Number(selectedBasePriceEntry.price ?? 0)))
  }, [selectedBasePriceEntry])

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

  const addPurityPrice = () => {
    const nextLabel = purityLabelInput.trim()
    if (!nextLabel) return
    const nextPrice = Number(purityPriceInput || 0)
    let nextDefaultId = ''
    setPurityPrices((prev) => {
      if (prev.some((entry) => entry.purity_label.toLowerCase() === nextLabel.toLowerCase())) {
        return prev
      }
      const nextRow: ProductPurityPrice = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        purity_label: nextLabel,
        price: Number.isFinite(nextPrice) ? nextPrice : 0,
        compare_at_price: null,
        sort_order: prev.length + 1,
      }
      nextDefaultId = nextRow.id ?? nextRow.purity_label
      return [...prev, nextRow]
    })
    setDefaultPurityPriceId((current) => current || nextDefaultId)
    setPurityLabelInput('')
    setPurityPriceInput('')
  }

  const addFitOption = () => {
    const next = fitInput.trim()
    if (!next) return
    setFitOptions((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setFitInput('')
  }

  const addGemstoneValue = () => {
    const next = gemstoneValueInput.trim()
    if (!next) return
    setGemstoneValues((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setGemstoneValueInput('')
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

  const setFallbackMetal = (metalId: string) => {
    setMetalMedia((prev) =>
      prev.map((entry) => ({
        ...entry,
        is_default_fallback: entry.metal_id === metalId,
      }))
    )
  }

  const removePurityPrice = (targetId: string) => {
    setPurityPrices((prev) =>
      prev
        .filter((entry) => entry.id !== targetId)
        .map((entry, index) => ({ ...entry, sort_order: index + 1 }))
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
      setShowPurity(true)
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
      const response = await authedFetch(productId ? `/api/products/${productId}` : productSlug ? `/api/products/by-slug/${productSlug}` : '/api/products', {
        method: productId || productSlug ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name,
          sku,
          product_lane: effectiveProductLane,
          detail_template: detailTemplate,
          featured,
          description: description || null,
          tag_line: tagLine || null,
          base_price: basePrice ? Number(basePrice) : null,
          discount_price: discountPrice ? Number(discountPrice) : null,
          gst_slab_id: gstSlabId || null,
          stock_quantity: Math.max(0, Number(stockQuantity || 0)),
          status: 'active',
          main_category_id: mainCategoryId,
          subcategory_id: subcategoryId || null,
          option_id: optionId || null,
          style_id: styleId || null,
          metal_ids: selectedMetalIds,
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
            gemstone_value: gemstoneValues.join(', ') || null,
            shapes_enabled: shapesEnabled,
            shape_ids: shapesEnabled ? selectedShapeIds : [],
            show_purity: showPurity,
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
          image_1_path: imagePaths[0],
          image_2_path: imagePaths[1],
          image_3_path: imagePaths[2],
          image_4_path: imagePaths[3],
          video_path: videoPath,
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
        window.location.href = backHref
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
    return <div className="rounded-lg border border-border bg-white px-8 py-12 text-sm text-muted-foreground shadow-sm">Loading product flow...</div>
  }

  return (
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
                    onValueChange={(value) => { setMainCategoryId(value); setSubcategoryId(''); setOptionId('') }}
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
                    <Select value={subcategoryId} onValueChange={(value) => { setSubcategoryId(value); setOptionId('') }}>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FormField label="Base Price *">
                  <Select
                    value={defaultPurityPriceId || undefined}
                    onValueChange={setDefaultPurityPriceId}
                    disabled={purityPrices.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={purityPrices.length ? 'Select base price' : 'Add purity pricing first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {purityPrices.map((entry) => {
                        const rowId = entry.id ?? entry.purity_label
                        return (
                          <SelectItem key={rowId} value={rowId}>
                            {Number(entry.price || 0).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              maximumFractionDigits: 0,
                            })}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
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
                Base price is sourced from the selected purity-price row so discount, GST, and storefront pricing stay aligned.
              </p>
            </section>

            <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Purity Pricing</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add purity-price pairs here, then choose one above as the product base price.
                  </p>
                </div>
                <PillToggle value={showPurity} onChange={setShowPurity} onLabel="Show on storefront" offLabel="Hidden on storefront" />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <input
                  value={purityLabelInput}
                  onChange={(e) => setPurityLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPurityPrice()
                    }
                  }}
                  placeholder="Purity like 18K or Pt 950"
                  className={inputClassName}
                />
                <input
                  value={purityPriceInput}
                  onChange={(e) => setPurityPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPurityPrice()
                    }
                  }}
                  placeholder="Price"
                  className={inputClassName}
                />
                <button type="button" onClick={addPurityPrice} className={secondaryButtonClassName}>Add</button>
              </div>
              {purityPrices.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {purityPrices.map((entry, index) => {
                      const rowId = entry.id ?? entry.purity_label
                      const isDefault = rowId === defaultPurityPriceId
                      return (
                        <div key={rowId} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                          <input
                            value={entry.purity_label}
                            onChange={(e) =>
                              setPurityPrices((prev) =>
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, purity_label: e.target.value } : row
                                )
                              )
                            }
                            className={inputClassName}
                          />
                          <input
                            value={String(entry.price ?? '')}
                            onChange={(e) =>
                              setPurityPrices((prev) =>
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, price: Number(e.target.value || 0) } : row
                                )
                              )
                            }
                            className={inputClassName}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDefault ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {isDefault ? 'Base Price' : `Row ${index + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePurityPrice(rowId)}
                              className="inline-flex items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground hover:border-border hover:bg-secondary"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {activeStep === 'attributes' ? (
          <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <h2 className="mb-8 text-xl font-bold text-foreground">Attributes and Filters</h2>
            <div className="space-y-6">
            <TogglePillGroup
              label="Metals"
              items={metals.map((item) => ({ id: item.id, label: item.name }))}
              selected={selectedMetalIds}
              onToggle={(value) => setSelectedMetalIds((prev) => toggleInArray(prev, value))}
            />

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
                <div className="flex gap-2">
                  <input
                    value={gemstoneValueInput}
                    onChange={(e) => setGemstoneValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addGemstoneValue()
                      }
                    }}
                    placeholder="Add a value like Natural Diamond, Ruby, Plain Gold..."
                    className={`${inputClassName} flex-1`}
                  />
                  <button type="button" onClick={addGemstoneValue} className={secondaryButtonClassName}>Add</button>
                  </div>
                  <TagList items={gemstoneValues} onRemove={(value) => setGemstoneValues((prev) => prev.filter((item) => item !== value))} />
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
                </div>

                <div className="mt-4">
                  <MediaVideoRow
                    fileName={videoFileName || null}
                    uploading={Boolean(uploadingVideos.base)}
                    onUpload={async (file) => {
                      setUploadingVideos((prev) => ({ ...prev, base: true }))
                      try {
                        const path = await uploadMedia(file, 'video', isHiphopProduct ? 'hiphop' : 'products')
                        setVideoFileName(path)
                        setVideoPath(path)
                        toast({ title: 'Uploaded', description: 'Product video uploaded successfully.' })
                      } catch (error) {
                        toast({
                          title: 'Upload failed',
                          description: error instanceof Error ? error.message : 'Unable to upload video.',
                          variant: 'destructive',
                        })
                      } finally {
                        setUploadingVideos((prev) => ({ ...prev, base: false }))
                      }
                    }}
                  />
                </div>

              {selectedMetalIds.length > 0 ? (
                <div className="mt-6 rounded-lg border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Metal Based Media</h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Upload up to four images and one optional video per selected metal. If a metal has no own media, storefront falls back to the shared base media first, then to the selected fallback metal when needed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {selectedMetalIds.map((metalId) => {
                      const metal = metals.find((entry) => entry.id === metalId)
                      const mediaEntry = metalMedia.find((entry) => entry.metal_id === metalId)
                      if (!metal || !mediaEntry) return null

                      return (
                        <button
                          key={metalId}
                          type="button"
                          onClick={() => setActiveMetalMediaId(metalId)}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                            activeMetalMediaId === metalId
                              ? 'border-foreground bg-foreground text-white'
                              : 'border-border bg-white text-foreground hover:bg-secondary'
                          }`}
                        >
                          {metal.name}
                        </button>
                      )
                    })}
                    {(() => {
                      const activeEntry = metalMedia.find((entry) => entry.metal_id === activeMetalMediaId)
                      if (!activeEntry) return null
                      return (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          {activeEntry.is_default_fallback ? 'Fallback metal active' : 'Base media remains the default fallback'}
                        </span>
                      )
                    })()}
                  </div>

                  {(() => {
                    const metal = metals.find((entry) => entry.id === activeMetalMediaId)
                    const mediaEntry = metalMedia.find((entry) => entry.metal_id === activeMetalMediaId)
                    if (!metal || !mediaEntry) return null

                    return (
                      <div className="mt-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{metal.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {mediaEntry.is_default_fallback ? 'Default fallback metal when metal-specific media is missing' : 'Uses base shared media unless this metal media is available'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFallbackMetal(activeMetalMediaId)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                              mediaEntry.is_default_fallback ? 'border-foreground bg-foreground text-white' : 'border-border bg-white text-foreground hover:bg-secondary'
                            }`}
                          >
                            {mediaEntry.is_default_fallback ? 'Fallback Metal' : 'Set As Fallback'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {[1, 2, 3, 4].map((slot) => {
                            const field = `image_${slot}_path` as ProductMetalMediaImageField
                            const path = mediaEntry[field]
                            return (
                              <MediaThumbnailSlot
                                key={`${activeMetalMediaId}-${field}`}
                                inputId={`metal-media-${activeMetalMediaId}-${field}`}
                                label={`${metal.name} ${slot}`}
                                path={path}
                                visible
                                uploading={Boolean(uploadingSlots[`metal-${activeMetalMediaId}-${field}`])}
                                onVisibleChange={() => {}}
                                onClear={() => {
                                  updateMetalMediaEntry(activeMetalMediaId, (entry) => ({ ...entry, [field]: null }))
                                }}
                                onUpload={async (file) => {
                                  setUploadingSlots((prev) => ({ ...prev, [`metal-${activeMetalMediaId}-${field}`]: true }))
                                  try {
                                    const uploadedPath = await uploadMedia(file, 'image', isHiphopProduct ? 'hiphop' : 'products')
                                    updateMetalMediaEntry(activeMetalMediaId, (entry) => ({ ...entry, [field]: uploadedPath }))
                                    toast({ title: 'Uploaded', description: `${metal.name} image ${slot} uploaded successfully.` })
                                  } catch (error) {
                                    toast({
                                      title: 'Upload failed',
                                      description: error instanceof Error ? error.message : `Unable to upload ${metal.name} image ${slot}.`,
                                      variant: 'destructive',
                                    })
                                  } finally {
                                    setUploadingSlots((prev) => ({ ...prev, [`metal-${activeMetalMediaId}-${field}`]: false }))
                                  }
                                }}
                              />
                            )
                          })}
                        </div>

                        <div className="mt-4">
                          <MediaVideoRow
                            fileName={mediaEntry.video_path || null}
                            uploading={Boolean(uploadingVideos[`metal-${activeMetalMediaId}`])}
                            onUpload={async (file) => {
                              setUploadingVideos((prev) => ({ ...prev, [`metal-${activeMetalMediaId}`]: true }))
                              try {
                                const uploadedPath = await uploadMedia(file, 'video', isHiphopProduct ? 'hiphop' : 'products')
                                updateMetalMediaEntry(activeMetalMediaId, (entry) => ({ ...entry, video_path: uploadedPath }))
                                toast({ title: 'Uploaded', description: `${metal.name} video uploaded successfully.` })
                              } catch (error) {
                                toast({
                                  title: 'Upload failed',
                                  description: error instanceof Error ? error.message : `Unable to upload ${metal.name} video.`,
                                  variant: 'destructive',
                                })
                              } finally {
                                setUploadingVideos((prev) => ({ ...prev, [`metal-${activeMetalMediaId}`]: false }))
                              }
                            }}
                          />
                        </div>
                      </div>
                    )
                  })()}
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

function ProductFormStepBar({
  steps,
  activeStep,
  onStepChange,
}: {
  steps: { id: ProductFormStepId; label: string; description: string }[]
  activeStep: ProductFormStepId
  onStepChange: (step: ProductFormStepId) => void
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Setup Flow</h2>
          <p className="mt-2 text-xs text-muted-foreground">Move step by step so the form loads lighter and each edit stays easier to manage.</p>
        </div>
        <span className="rounded-full border border-border bg-secondary/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {steps.findIndex((step) => step.id === activeStep) + 1} / {steps.length}
        </span>
      </div>

        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-6">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep
            const isCompleted = steps.findIndex((entry) => entry.id === activeStep) > index

          return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-foreground bg-foreground text-white shadow-md'
                    : isCompleted
                      ? 'border-border bg-secondary/20 text-foreground hover:bg-secondary/40'
                      : 'border-border bg-white text-foreground hover:bg-secondary/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive ? 'bg-white/15 text-white' : 'bg-secondary text-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <p className="text-[13px] font-semibold leading-none">{step.label}</p>
                </div>
              </button>
            )
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{steps.find((step) => step.id === activeStep)?.description}</p>
    </section>
  )
}

function ProductFormStepActions({
  isFirstStep,
  isLastStep,
  saving,
  backHref,
  submitLabel,
  onPrevious,
  onNext,
}: {
  isFirstStep: boolean
  isLastStep: boolean
  saving: boolean
  backHref: string
  submitLabel: string
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="sticky bottom-4 z-20 rounded-2xl border border-border border-t bg-white/98 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isFirstStep ? (
            <button
              type="button"
              onClick={onPrevious}
              className="rounded border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Back
            </button>
          ) : (
            <Link href={backHref} className="rounded border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Cancel
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isLastStep ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          ) : (
            <>
              <Link href={backHref} className="rounded border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                Cancel
              </Link>
              <button type="submit" disabled={saving} className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : submitLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function KeyValueSection({
  title,
  description,
  rows,
  onChange,
}: {
  title: string
  description: string
  rows: ProductKeyValue[]
  onChange: Dispatch<SetStateAction<ProductKeyValue[]>>
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange((prev) => [...prev, emptyRow()])}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <Plus size={14} />
          Add Row
        </button>
      </div>

      <div className="space-y-0">
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className={`grid grid-cols-1 gap-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] ${index < rows.length - 1 ? 'border-b border-border/40' : ''}`}>
            <input
              value={row.key}
              onChange={(e) => onChange((prev) => prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, key: e.target.value } : entry)))}
              placeholder="Label"
              className={inputClassName}
            />
            <input
              value={row.value}
              onChange={(e) => onChange((prev) => prev.map((entry, rowIndex) => (rowIndex === index ? { ...entry, value: e.target.value } : entry)))}
              placeholder="Value"
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => onChange((prev) => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev))}
              className="inline-flex items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm text-muted-foreground hover:border-border hover:bg-secondary"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function PolicyEditor({
  title,
  description,
  enabled,
  onEnabledChange,
  rules,
  selectedRuleId,
  onRuleChange,
  overrideEnabled,
  onOverrideEnabledChange,
  titleOverride,
  onTitleOverrideChange,
  bodyOverride,
  onBodyOverrideChange,
}: {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  rules: ProductContentRule[]
  selectedRuleId: string
  onRuleChange: (value: string) => void
  overrideEnabled: boolean
  onOverrideEnabledChange: (value: boolean) => void
  titleOverride: string
  onTitleOverrideChange: Dispatch<SetStateAction<string>>
  bodyOverride: string
  onBodyOverrideChange: Dispatch<SetStateAction<string>>
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <PillToggle value={enabled} onChange={onEnabledChange} onLabel="Enabled" offLabel="Disabled" />
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          <FormField label={`${title} Rule`}>
            <Select value={selectedRuleId || '__none__'} onValueChange={(value) => onRuleChange(value === '__none__' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${title.toLowerCase()} rule`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No linked rule</SelectItem>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="rounded-lg border border-border/70 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Override Linked Rule</p>
                <p className="mt-2 text-xs text-muted-foreground">Only enable this when the product needs custom shipping or warranty text instead of the shared rule.</p>
              </div>
              <PillToggle value={overrideEnabled} onChange={onOverrideEnabledChange} onLabel="Override On" offLabel="Use Rule" />
            </div>

            {overrideEnabled ? (
              <div className="mt-4 grid grid-cols-1 gap-4">
                <FormField label={`${title} Title Override`}>
                  <input
                    value={titleOverride}
                    onChange={(e) => onTitleOverrideChange(e.target.value)}
                    placeholder={`Leave blank to use the selected ${title.toLowerCase()} rule title`}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label={`${title} Body Override`}>
                  <textarea
                    value={bodyOverride}
                    onChange={(e) => onBodyOverrideChange(e.target.value)}
                    rows={4}
                    placeholder={`Leave blank to use the selected ${title.toLowerCase()} rule body`}
                    className={inputClassName}
                  />
                </FormField>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
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
          const file = event.target.files?.[0]
          if (!file) return
          void onUpload(file)
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}

function MediaVideoRow({
  fileName,
  uploading = false,
  onUpload,
}: {
  fileName: string | null | undefined
  uploading?: boolean
  onUpload: (file: File) => void | Promise<void>
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:border-primary">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/30 text-foreground">
          <Video size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Video</p>
          <p className="truncate text-xs text-muted-foreground">{fileName || 'No video'}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Uploading' : 'Upload'}
      </span>
      <input
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          void onUpload(file)
        }}
      />
    </label>
  )
}

const inputClassName =
  'w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'

const secondaryButtonClassName =
  'rounded bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors'
