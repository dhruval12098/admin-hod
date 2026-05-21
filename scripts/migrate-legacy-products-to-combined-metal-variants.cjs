const fs = require('fs')
const path = require('path')

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const result = {}
  for (const line of content.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue
    const index = line.indexOf('=')
    if (index < 0) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    result[key] = value
  }
  return result
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildCombinedLabel({ purityLabel, baseMetalName, name, displayLabel }) {
  const purity = String(purityLabel || '').trim()
  const baseMetal = String(baseMetalName || name || '').trim()
  const normalizedDisplayLabel = String(displayLabel || '').trim()
  if (normalizedDisplayLabel && (!purity || (normalizedDisplayLabel !== String(name || '').trim() && normalizedDisplayLabel !== baseMetal))) {
    return normalizedDisplayLabel
  }
  return purity ? `${purity} ${baseMetal}`.trim() : baseMetal
}

function detectMetalFamily(value) {
  const source = normalizeName(value)
  if (!source) return null
  if (source.includes('yellow') || /(^|[\s-])yg($|[\s-])/.test(source) || /(^|[\s-])y($|[\s-])/.test(source)) return 'yellow gold'
  if (source.includes('white') || /(^|[\s-])wg($|[\s-])/.test(source) || /(^|[\s-])w($|[\s-])/.test(source)) return 'white gold'
  if (source.includes('rose') || /(^|[\s-])rg($|[\s-])/.test(source) || /(^|[\s-])r($|[\s-])/.test(source)) return 'rose gold'
  if (source.includes('platinum') || source.includes('pt 950') || source.includes('pt950') || /(^|[\s-])pt($|[\s-])/.test(source)) return 'platinum'
  return null
}

function normalizePurityToken(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  const karatMatch = source.match(/\b(10|12|14|18|22)\s*k?\b/i)
  if (karatMatch) return `${karatMatch[1]}K`
  if (/\b925\b/.test(source)) return '925'
  if ((/\b950\b/.test(source) || /\bpt\b/i.test(source)) && /(pt|platinum)/i.test(source)) return 'Pt 950'
  return source.replace(/\s+/g, ' ').trim()
}

function resolveLegacyPurityContext(value) {
  const rawLabel = String(value || '').trim()
  const shorthandMatch = rawLabel.match(/^(\d{2,3})\s*([ywr])$/i)
  if (shorthandMatch) {
    const metalHint = shorthandMatch[2].toLowerCase() === 'y'
      ? 'yellow gold'
      : shorthandMatch[2].toLowerCase() === 'w'
        ? 'white gold'
        : 'rose gold'
    return {
      rawLabel,
      purityLabel: `${shorthandMatch[1]}K`,
      metalHint,
    }
  }
  return {
    rawLabel,
    purityLabel: normalizePurityToken(rawLabel),
    metalHint: detectMetalFamily(rawLabel),
  }
}

function mediaItemsFromLegacyRow(productId, variantId, row) {
  if (!row) return []
  const items = []
  const images = [row.image_1_path, row.image_2_path, row.image_3_path, row.image_4_path].filter(Boolean)
  images.forEach((mediaPath, index) => {
    items.push({
      product_id: productId,
      variant_id: variantId,
      media_type: 'image',
      media_path: mediaPath,
      sort_order: index + 1,
      is_default_fallback: false,
    })
  })
  if (row.video_path) {
    items.push({
      product_id: productId,
      variant_id: variantId,
      media_type: 'video',
      media_path: row.video_path,
      sort_order: items.length + 1,
      is_default_fallback: false,
    })
  }
  return items
}

function defaultMediaItemsFromProduct(product) {
  const items = []
  const images = [product.image_1_path, product.image_2_path, product.image_3_path, product.image_4_path].filter(Boolean)
  images.forEach((mediaPath, index) => {
    items.push({
      product_id: product.id,
      variant_id: null,
      media_type: 'image',
      media_path: mediaPath,
      sort_order: index + 1,
      is_default_fallback: true,
    })
  })
  if (product.video_path) {
    items.push({
      product_id: product.id,
      variant_id: null,
      media_type: 'video',
      media_path: product.video_path,
      sort_order: items.length + 1,
      is_default_fallback: true,
    })
  }
  return items
}

async function run() {
  const env = parseEnvFile(path.join(__dirname, '..', '.env.local'))
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase credentials in admin/.env.local')
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })

  const dryRun = process.argv.includes('--dry-run')

  const [
    productsResult,
    catalogMetalsResult,
    compositionPartsResult,
    legacySelectionsResult,
    legacyPurityPricesResult,
    legacyMetalMediaResult,
    existingVariantsResult,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, base_price, default_purity_price_id, image_1_path, image_2_path, image_3_path, image_4_path, video_path, show_purity')
      .order('created_at', { ascending: true }),
    supabase
      .from('catalog_metals')
      .select('id, name, slug, purity_label, base_metal_name, display_label, is_combined_option, color_hex, composition_description, display_order, status'),
    supabase
      .from('metal_composition_parts')
      .select('metal_id, part_name, percentage, color_hex, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_metal_selections')
      .select('product_id, metal_id, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_purity_prices')
      .select('id, product_id, purity_label, price, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_metal_media')
      .select('product_id, metal_id, image_1_path, image_2_path, image_3_path, image_4_path, video_path, is_default_fallback'),
    supabase
      .from('product_metal_variants')
      .select('product_id'),
  ])

  for (const result of [productsResult, catalogMetalsResult, compositionPartsResult, legacySelectionsResult, legacyPurityPricesResult, legacyMetalMediaResult, existingVariantsResult]) {
    if (result.error) throw result.error
  }

  const products = productsResult.data || []
  const catalogMetals = catalogMetalsResult.data || []
  const compositionParts = compositionPartsResult.data || []
  const legacySelections = legacySelectionsResult.data || []
  const legacyPurityPrices = legacyPurityPricesResult.data || []
  const legacyMetalMedia = legacyMetalMediaResult.data || []
  const existingVariantProductIds = new Set((existingVariantsResult.data || []).map((row) => row.product_id))

  const compositionPartsByMetalId = new Map()
  for (const part of compositionParts) {
    const bucket = compositionPartsByMetalId.get(part.metal_id) || []
    bucket.push(part)
    compositionPartsByMetalId.set(part.metal_id, bucket)
  }

  const metalById = new Map(catalogMetals.map((metal) => [metal.id, metal]))
  const metalByCombinedKey = new Map()
  for (const metal of catalogMetals) {
    const baseMetal = String(metal.base_metal_name || metal.name || '').trim()
    const purity = String(metal.purity_label || '').trim()
    const key = `${normalizeName(baseMetal)}::${normalizeName(purity)}`
    if (key !== '::') {
      metalByCombinedKey.set(key, metal)
    }
  }

  const selectionsByProduct = new Map()
  for (const row of legacySelections) {
    const bucket = selectionsByProduct.get(row.product_id) || []
    bucket.push(row)
    selectionsByProduct.set(row.product_id, bucket)
  }

  const purityRowsByProduct = new Map()
  for (const row of legacyPurityPrices) {
    const bucket = purityRowsByProduct.get(row.product_id) || []
    bucket.push(row)
    purityRowsByProduct.set(row.product_id, bucket)
  }

  const mediaRowsByProduct = new Map()
  for (const row of legacyMetalMedia) {
    const bucket = mediaRowsByProduct.get(row.product_id) || []
    bucket.push(row)
    mediaRowsByProduct.set(row.product_id, bucket)
  }

  const skipped = []
  const migrated = []

  for (const product of products) {
    if (existingVariantProductIds.has(product.id)) continue

    const selectedMetals = (selectionsByProduct.get(product.id) || []).map((row) => metalById.get(row.metal_id)).filter(Boolean)
    if (selectedMetals.length < 1) continue

    const purityRows = (purityRowsByProduct.get(product.id) || []).filter((row) => Number(row.price || 0) > 0)
    const mediaRows = mediaRowsByProduct.get(product.id) || []
    const defaultPurityRow =
      purityRows.find((row) => row.id === product.default_purity_price_id) ||
      purityRows[0] ||
      null
    const defaultLegacyMetalId =
      mediaRows.find((row) => row.is_default_fallback)?.metal_id ||
      selectedMetals[0]?.id ||
      null

    const variantBlueprints = []
    const missingKeys = []

    if (purityRows.length > 0) {
      for (const selectedMetal of selectedMetals) {
        const baseMetalName = String(selectedMetal.base_metal_name || selectedMetal.name || '').trim()
        const selectedMetalFamily = detectMetalFamily(baseMetalName)
        const mediaRow = mediaRows.find((row) => row.metal_id === selectedMetal.id) || null
        for (const purityRow of purityRows) {
          const { purityLabel, metalHint, rawLabel } = resolveLegacyPurityContext(purityRow.purity_label)
          if (metalHint && selectedMetalFamily && metalHint !== selectedMetalFamily) {
            continue
          }
          if (metalHint === 'platinum' && selectedMetalFamily && selectedMetalFamily !== 'platinum') {
            continue
          }
          const combinedKey = `${normalizeName(baseMetalName)}::${normalizeName(purityLabel)}`
          let combinedMetal = metalByCombinedKey.get(combinedKey)

          if (!combinedMetal) {
            const combinedLabel = buildCombinedLabel({
              purityLabel,
              baseMetalName,
              name: selectedMetal.name,
              displayLabel: null,
            })

            if (dryRun) {
              combinedMetal = {
                id: `dry-${combinedKey}`,
                name: combinedLabel,
                slug: slugify(combinedLabel),
                purity_label: purityLabel,
                base_metal_name: baseMetalName,
                display_label: combinedLabel,
                is_combined_option: true,
                color_hex: selectedMetal.color_hex || null,
                composition_description: selectedMetal.composition_description || null,
                display_order: selectedMetal.display_order || 0,
                status: selectedMetal.status || 'active',
              }
            } else {
              const insertResult = await supabase
                .from('catalog_metals')
                .insert({
                  name: combinedLabel,
                  slug: slugify(combinedLabel),
                  purity_label: purityLabel,
                  base_metal_name: baseMetalName,
                  display_label: combinedLabel,
                  is_combined_option: true,
                  color_hex: selectedMetal.color_hex || null,
                  composition_description: selectedMetal.composition_description || null,
                  display_order: selectedMetal.display_order || 0,
                  status: selectedMetal.status || 'active',
                })
                .select('*')
                .single()
              if (insertResult.error) throw insertResult.error
              combinedMetal = insertResult.data

              const baseCompositionParts = compositionPartsByMetalId.get(selectedMetal.id) || []
              if (baseCompositionParts.length > 0) {
                const clonedParts = baseCompositionParts.map((part) => ({
                  metal_id: combinedMetal.id,
                  part_name: part.part_name,
                  percentage: part.percentage,
                  color_hex: part.color_hex || null,
                  sort_order: part.sort_order,
                }))
                const compositionInsertResult = await supabase.from('metal_composition_parts').insert(clonedParts)
                if (compositionInsertResult.error) throw compositionInsertResult.error
                compositionPartsByMetalId.set(combinedMetal.id, clonedParts)
              }
            }

            metalByCombinedKey.set(combinedKey, combinedMetal)
            metalById.set(combinedMetal.id, combinedMetal)
          }

          if (!combinedMetal) {
            missingKeys.push(rawLabel || combinedKey)
            continue
          }

          variantBlueprints.push({
            metal: combinedMetal,
            baseMetal: selectedMetal,
            price: Number(purityRow.price || 0),
            purityLabel,
            mediaRow,
            isDefault:
              String(selectedMetal.id) === String(defaultLegacyMetalId) &&
              String(purityRow.id) === String(defaultPurityRow?.id || ''),
          })
        }
      }
    } else {
      for (const [index, selectedMetal] of selectedMetals.entries()) {
        const mediaRow = mediaRows.find((row) => row.metal_id === selectedMetal.id) || null
        variantBlueprints.push({
          metal: selectedMetal,
          baseMetal: selectedMetal,
          price: Number(product.base_price || 0),
          purityLabel: String(selectedMetal.purity_label || '').trim(),
          mediaRow,
          isDefault: index === 0,
        })
      }
    }

    if (missingKeys.length > 0 || variantBlueprints.length < 1) {
      skipped.push({
        product: product.slug,
        reason: missingKeys.length > 0 ? `Missing combined master rows: ${missingKeys.join(', ')}` : 'No variant rows could be derived',
      })
      continue
    }

    if (!variantBlueprints.some((entry) => entry.isDefault)) {
      variantBlueprints[0].isDefault = true
    }

    if (dryRun) {
      migrated.push({
        product: product.slug,
        variants: variantBlueprints.map((entry) => ({
          label: buildCombinedLabel(entry.metal),
          price: entry.price,
        })),
      })
      continue
    }

    const { error: deleteSelectionsError } = await supabase.from('product_metal_selections').delete().eq('product_id', product.id)
    if (deleteSelectionsError) throw deleteSelectionsError

    const { error: deleteVariantsError } = await supabase.from('product_metal_variants').delete().eq('product_id', product.id)
    if (deleteVariantsError) throw deleteVariantsError

    const { error: deleteVariantMediaError } = await supabase.from('product_variant_media_items').delete().eq('product_id', product.id)
    if (deleteVariantMediaError) throw deleteVariantMediaError

    const insertedVariantRows = []
    for (const [index, blueprint] of variantBlueprints.entries()) {
      const variantInsertResult = await supabase
        .from('product_metal_variants')
        .insert({
          product_id: product.id,
          metal_id: blueprint.metal.id,
          price: blueprint.price,
          is_default: Boolean(blueprint.isDefault),
          sort_order: index + 1,
        })
        .select('id, metal_id')
        .single()
      if (variantInsertResult.error) throw variantInsertResult.error
      insertedVariantRows.push({
        id: variantInsertResult.data.id,
        metal_id: blueprint.metal.id,
        mediaRow: blueprint.mediaRow,
      })
    }

    const selectionRows = variantBlueprints.map((blueprint, index) => ({
      product_id: product.id,
      metal_id: blueprint.metal.id,
      sort_order: index + 1,
    }))
    const { error: insertSelectionsError } = await supabase.from('product_metal_selections').insert(selectionRows)
    if (insertSelectionsError) throw insertSelectionsError

    const mediaInsertRows = defaultMediaItemsFromProduct(product)
    for (const inserted of insertedVariantRows) {
      mediaInsertRows.push(...mediaItemsFromLegacyRow(product.id, inserted.id, inserted.mediaRow))
    }
    if (mediaInsertRows.length > 0) {
      const { error: insertMediaError } = await supabase.from('product_variant_media_items').insert(mediaInsertRows)
      if (insertMediaError) throw insertMediaError
    }

    const defaultVariant = variantBlueprints.find((entry) => entry.isDefault) || variantBlueprints[0]
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({
        base_price: Number(defaultVariant.price || 0),
        show_purity: false,
      })
      .eq('id', product.id)
    if (productUpdateError) throw productUpdateError

    migrated.push({
      product: product.slug,
      variants: variantBlueprints.map((entry) => ({
        label: buildCombinedLabel(entry.metal),
        price: entry.price,
      })),
    })
  }

  console.log(JSON.stringify({
    dryRun,
    migratedCount: migrated.length,
    skippedCount: skipped.length,
    migrated,
    skipped,
  }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
