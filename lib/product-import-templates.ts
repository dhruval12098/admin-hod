export type ProductImportTemplateSlug = 'excel-template' | 'blank-csv' | 'sample-csv' | 'image-guide'

export type ProductImportColumnGroup = 'required' | 'optional' | 'system'

export type ProductImportColumn = {
  key: string
  label: string
  group: ProductImportColumnGroup
  required: boolean
  description: string
  example: string
}

export const PRODUCT_IMPORT_COLUMNS: ProductImportColumn[] = [
  {
    key: 'product_name',
    label: 'Product Name',
    group: 'required',
    required: true,
    description: 'Customer-facing name of the product.',
    example: 'Celeste Diamond Ring',
  },
  {
    key: 'sku',
    label: 'SKU',
    group: 'required',
    required: true,
    description: 'Unique product code used to match images and avoid duplicates.',
    example: 'HDR-1001',
  },
  {
    key: 'lane',
    label: 'Lane',
    group: 'required',
    required: true,
    description: 'Decides whether the product belongs to the standard, hiphop, or collection flow.',
    example: 'standard',
  },
  {
    key: 'category',
    label: 'Category',
    group: 'required',
    required: true,
    description: 'Main category name exactly as it exists in the catalog.',
    example: 'Rings',
  },
  {
    key: 'subcategory',
    label: 'Subcategory',
    group: 'optional',
    required: false,
    description: 'Subcategory name when the selected category uses one.',
    example: 'Engagement Rings',
  },
  {
    key: 'option_name',
    label: 'Option',
    group: 'optional',
    required: false,
    description: 'Option name when the selected subcategory uses one.',
    example: 'Solitaire',
  },
  {
    key: 'style_name',
    label: 'Style',
    group: 'optional',
    required: false,
    description: 'Style name from the catalog setup.',
    example: 'Classic',
  },
  {
    key: 'description',
    label: 'Description',
    group: 'required',
    required: true,
    description: 'Main product description shown on the storefront.',
    example: 'Elegant solitaire ring crafted for everyday luxury.',
  },
  {
    key: 'stock_quantity',
    label: 'Stock Quantity',
    group: 'required',
    required: true,
    description: 'Available stock count. Use 0 if unavailable.',
    example: '5',
  },
  {
    key: 'discount_price',
    label: 'Discount Price',
    group: 'optional',
    required: false,
    description: 'Optional discounted selling price.',
    example: '54999',
  },
  {
    key: 'gst_slab_name',
    label: 'GST Slab',
    group: 'optional',
    required: false,
    description: 'GST slab name exactly as configured in the catalog.',
    example: 'GST 3%',
  },
  {
    key: 'metal_1',
    label: 'Metal 1',
    group: 'optional',
    required: false,
    description: 'Primary metal selection from the catalog master table.',
    example: '14K Yellow Gold',
  },
  {
    key: 'metal_2',
    label: 'Metal 2',
    group: 'optional',
    required: false,
    description: 'Optional second metal selection.',
    example: 'Platinum',
  },
  {
    key: 'metal_3',
    label: 'Metal 3',
    group: 'optional',
    required: false,
    description: 'Optional third metal selection.',
    example: '',
  },
  {
    key: 'certificate_1',
    label: 'Certificate 1',
    group: 'optional',
    required: false,
    description: 'Primary certificate selection from the catalog master table.',
    example: 'IGI',
  },
  {
    key: 'certificate_2',
    label: 'Certificate 2',
    group: 'optional',
    required: false,
    description: 'Optional second certificate selection.',
    example: 'GIA',
  },
  {
    key: 'material_value_1',
    label: 'Material Value 1',
    group: 'optional',
    required: false,
    description: 'Primary material selector value from the catalog master table.',
    example: 'Glossy Finish',
  },
  {
    key: 'material_value_2',
    label: 'Material Value 2',
    group: 'optional',
    required: false,
    description: 'Optional second material selector value.',
    example: 'Comfort Fit',
  },
  {
    key: 'material_value_3',
    label: 'Material Value 3',
    group: 'optional',
    required: false,
    description: 'Optional third material selector value.',
    example: '',
  },
  {
    key: 'material_value_4',
    label: 'Material Value 4',
    group: 'optional',
    required: false,
    description: 'Optional fourth material selector value.',
    example: '',
  },
  {
    key: 'purity_1_label',
    label: 'Purity 1 Label',
    group: 'required',
    required: true,
    description: 'First purity label. The importer will use purity rows to build pricing.',
    example: '18K',
  },
  {
    key: 'purity_1_price',
    label: 'Purity 1 Price',
    group: 'required',
    required: true,
    description: 'Price for the first purity row.',
    example: '59999',
  },
  {
    key: 'purity_2_label',
    label: 'Purity 2 Label',
    group: 'optional',
    required: false,
    description: 'Optional second purity label.',
    example: '22K',
  },
  {
    key: 'purity_2_price',
    label: 'Purity 2 Price',
    group: 'optional',
    required: false,
    description: 'Optional price for the second purity row.',
    example: '64999',
  },
  {
    key: 'purity_3_label',
    label: 'Purity 3 Label',
    group: 'optional',
    required: false,
    description: 'Optional third purity label.',
    example: 'Pt 950',
  },
  {
    key: 'purity_3_price',
    label: 'Purity 3 Price',
    group: 'optional',
    required: false,
    description: 'Optional price for the third purity row.',
    example: '68999',
  },
  {
    key: 'image_1',
    label: 'Image 1',
    group: 'required',
    required: true,
    description: 'Main image filename only, not a full path.',
    example: 'HDR-1001_main.jpg',
  },
  {
    key: 'image_2',
    label: 'Image 2',
    group: 'optional',
    required: false,
    description: 'Second image filename if available.',
    example: 'HDR-1001_side.jpg',
  },
  {
    key: 'image_3',
    label: 'Image 3',
    group: 'optional',
    required: false,
    description: 'Third image filename if available.',
    example: 'HDR-1001_top.jpg',
  },
  {
    key: 'image_4',
    label: 'Image 4',
    group: 'optional',
    required: false,
    description: 'Fourth image filename if available.',
    example: 'HDR-1001_detail.jpg',
  },
  {
    key: 'video',
    label: 'Video',
    group: 'optional',
    required: false,
    description: 'Optional product video filename only.',
    example: 'HDR-1001_video.mp4',
  },
  {
    key: 'spec_1_key',
    label: 'Specification 1 Key',
    group: 'optional',
    required: false,
    description: 'Optional product specification label.',
    example: 'Occasion',
  },
  {
    key: 'spec_1_value',
    label: 'Specification 1 Value',
    group: 'optional',
    required: false,
    description: 'Optional product specification value.',
    example: 'Bridal',
  },
  {
    key: 'spec_2_key',
    label: 'Specification 2 Key',
    group: 'optional',
    required: false,
    description: 'Optional second product specification label.',
    example: 'Setting',
  },
  {
    key: 'spec_2_value',
    label: 'Specification 2 Value',
    group: 'optional',
    required: false,
    description: 'Optional second product specification value.',
    example: 'Prong',
  },
  {
    key: 'spec_3_key',
    label: 'Specification 3 Key',
    group: 'optional',
    required: false,
    description: 'Optional third product specification label.',
    example: 'Finish',
  },
  {
    key: 'spec_3_value',
    label: 'Specification 3 Value',
    group: 'optional',
    required: false,
    description: 'Optional third product specification value.',
    example: 'High Polish',
  },
  {
    key: 'spec_4_key',
    label: 'Specification 4 Key',
    group: 'optional',
    required: false,
    description: 'Optional fourth product specification label.',
    example: '',
  },
  {
    key: 'spec_4_value',
    label: 'Specification 4 Value',
    group: 'optional',
    required: false,
    description: 'Optional fourth product specification value.',
    example: '',
  },
  {
    key: 'engraving_label',
    label: 'Engraving Label',
    group: 'optional',
    required: false,
    description: 'Leave blank if engraving is not needed.',
    example: 'Complimentary Engraving',
  },
  {
    key: 'system_notes',
    label: 'System Notes',
    group: 'system',
    required: false,
    description: 'Reference-only field for explaining what the importer auto-decides.',
    example: 'Collection lane auto-disables checkout.',
  },
]

const SAMPLE_ROW_STANDARD: Record<string, string> = {
  product_name: 'Celeste Diamond Ring',
  sku: 'HDR-1001',
  lane: 'standard',
  category: 'Fine Jewellery',
  subcategory: 'Rings',
  option_name: 'Eternity Rings',
  style_name: 'Classic',
  description: 'Elegant solitaire ring crafted for everyday luxury.',
  stock_quantity: '5',
  discount_price: '54999',
  gst_slab_name: 'GST 3%',
  metal_1: '14K Yellow Gold',
  metal_2: 'Platinum',
  metal_3: '',
  certificate_1: 'IGI',
  certificate_2: '',
  material_value_1: '',
  material_value_2: '',
  material_value_3: '',
  material_value_4: '',
  purity_1_label: '18K',
  purity_1_price: '59999',
  purity_2_label: '22K',
  purity_2_price: '64999',
  purity_3_label: '',
  purity_3_price: '',
  image_1: 'HDR-1001_main.jpg',
  image_2: 'HDR-1001_side.jpg',
  image_3: 'HDR-1001_top.jpg',
  image_4: '',
  video: '',
  spec_1_key: 'Occasion',
  spec_1_value: 'Bridal',
  spec_2_key: 'Setting',
  spec_2_value: 'Prong',
  spec_3_key: '',
  spec_3_value: '',
  spec_4_key: '',
  spec_4_value: '',
  engraving_label: 'Complimentary Engraving',
  system_notes: 'Importer will auto-derive base price, shipping, care & warranty, featured, and ready-to-ship defaults.',
}

const SAMPLE_ROW_HIPHOP: Record<string, string> = {
  product_name: 'Apex Tennis Chain',
  sku: 'HHP-2001',
  lane: 'hiphop',
  category: 'hiphop',
  subcategory: 'Chains',
  option_name: 'Cuban Links',
  style_name: 'Modern',
  description: 'Premium hip hop tennis chain with bold shine and statement presence.',
  stock_quantity: '2',
  discount_price: '',
  gst_slab_name: 'GST 3%',
  metal_1: '10K White Gold',
  metal_2: '',
  metal_3: '',
  certificate_1: 'None',
  certificate_2: '',
  material_value_1: '',
  material_value_2: '',
  material_value_3: '',
  material_value_4: '',
  purity_1_label: '14K',
  purity_1_price: '189999',
  purity_2_label: '18K',
  purity_2_price: '219999',
  purity_3_label: '',
  purity_3_price: '',
  image_1: 'HHP-2001_main.jpg',
  image_2: 'HHP-2001_close.jpg',
  image_3: '',
  image_4: '',
  video: 'HHP-2001_video.mp4',
  spec_1_key: 'Style',
  spec_1_value: 'Statement',
  spec_2_key: '',
  spec_2_value: '',
  spec_3_key: '',
  spec_3_value: '',
  spec_4_key: '',
  spec_4_value: '',
  engraving_label: '',
  system_notes: 'Importer will force hiphop template rules and apply default policies from the master tables.',
}

function escapeCsvCell(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function toCsvRow(values: string[]) {
  return values.map((value) => escapeCsvCell(value)).join(',')
}

export function getProductImportTemplateColumns() {
  return PRODUCT_IMPORT_COLUMNS
}

export function buildBlankProductImportCsv() {
  const headers = PRODUCT_IMPORT_COLUMNS.filter((column) => column.group !== 'system').map((column) => column.key)
  return `${toCsvRow(headers)}\n`
}

export function buildSampleProductImportCsv() {
  const headers = PRODUCT_IMPORT_COLUMNS.filter((column) => column.group !== 'system').map((column) => column.key)
  const rows = [SAMPLE_ROW_STANDARD, SAMPLE_ROW_HIPHOP].map((row) =>
    toCsvRow(headers.map((header) => row[header] ?? ''))
  )

  return [toCsvRow(headers), ...rows].join('\n') + '\n'
}

export function buildProductImportImageGuide() {
  return [
    'Bulk Product Import Image Guide',
    '',
    '1. Put all product images and videos into one folder before zipping.',
    '2. Use the product SKU at the start of every file name.',
    '3. Match the exact file names in the CSV image and video columns.',
    '4. Do not paste storage paths or URLs into the CSV.',
    '',
    'Recommended naming examples:',
    '- HDR-1001_main.jpg',
    '- HDR-1001_side.jpg',
    '- HDR-1001_top.jpg',
    '- HDR-1001_detail.jpg',
    '- HDR-1001_video.mp4',
    '',
    'Tips:',
    '- Keep file names simple.',
    '- Avoid spaces when possible.',
    '- Use .jpg, .png, or .webp for images.',
    '- Use .mp4 for videos when possible.',
    '- If a product does not have image 3 or image 4, leave those CSV cells blank.',
  ].join('\n')
}
