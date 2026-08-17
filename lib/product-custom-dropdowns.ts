export type ProductCustomDropdownOption = {
  id: string
  label: string
  value: string
  is_enabled: boolean
  display_order: number
}

export type ProductCustomDropdown = {
  id: string
  name: string
  label: string
  is_enabled: boolean
  is_required: boolean
  display_order: number
  options: ProductCustomDropdownOption[]
}

function hasDropdownContent(group: ProductCustomDropdown) {
  return Boolean(
    group.name.trim() ||
    group.label.trim() ||
    group.options.some((option) => option.label.trim() || option.value.trim())
  )
}

function normalizeProductCustomDropdowns(groups: ProductCustomDropdown[]) {
  return groups
    .filter(hasDropdownContent)
    .map((group) => ({
      ...group,
      name: group.name.trim(),
      label: group.label.trim(),
      options: group.options
        .filter((option) => option.label.trim() || option.value.trim())
        .map((option) => ({
          ...option,
          label: option.label.trim(),
          value: option.value.trim(),
        })),
    }))
}

export function validateProductCustomDropdowns(groups: ProductCustomDropdown[]) {
  const names = new Set<string>()
  const enabledGroups = normalizeProductCustomDropdowns(groups).filter((group) => group.is_enabled)
  if (!enabledGroups.length) return 'Add at least one enabled custom dropdown, or disable custom product dropdowns.'

  for (const group of enabledGroups) {
    const name = group.name.trim().toLowerCase()
    if (!name || !group.label.trim()) return 'Every enabled dropdown needs a name and customer label.'
    if (names.has(name)) return `Dropdown name “${group.name.trim()}” is duplicated.`
    names.add(name)
    const values = new Set<string>()
    const enabled = group.options.filter((option) => option.is_enabled)
    if (!enabled.length) return `“${group.label.trim()}” needs at least one enabled option.`
    for (const option of enabled) {
      const value = option.value.trim().toLowerCase()
      if (!option.label.trim() || !value) return `Every enabled option in “${group.label.trim()}” needs a label and value.`
      if (values.has(value)) return `Option value “${option.value.trim()}” is duplicated in “${group.label.trim()}”.`
      values.add(value)
    }
  }
  return null
}

export async function loadProductCustomDropdowns(adminClient: any, productId: string): Promise<{ data?: ProductCustomDropdown[]; error?: string }> {
  const groupsResult = await adminClient.from('product_custom_dropdowns').select('*').eq('product_id', productId).order('display_order')
  if (groupsResult.error) return { error: groupsResult.error.message }
  const groups = groupsResult.data ?? []
  if (!groups.length) return { data: [] }
  const optionsResult = await adminClient.from('product_custom_dropdown_options').select('*').in('dropdown_id', groups.map((row: any) => row.id)).order('display_order')
  if (optionsResult.error) return { error: optionsResult.error.message }
  return { data: groups.map((group: any) => ({ ...group, options: (optionsResult.data ?? []).filter((option: any) => option.dropdown_id === group.id) })) }
}

export async function syncProductCustomDropdowns(adminClient: any, productId: string, groups: ProductCustomDropdown[], validateEnabledGroups = true) {
  const normalizedGroups = normalizeProductCustomDropdowns(groups)
  const validationError = validateEnabledGroups ? validateProductCustomDropdowns(normalizedGroups) : null
  if (validationError) return { error: validationError }

  const parentRows = normalizedGroups.map((group, index) => ({ id: group.id, product_id: productId, name: group.name, label: group.label, is_enabled: group.is_enabled, is_required: group.is_required, display_order: index }))
  if (parentRows.length) {
    const result = await adminClient.from('product_custom_dropdowns').upsert(parentRows, { onConflict: 'id' })
    if (result.error) return { error: result.error.message }
  }
  for (const group of normalizedGroups) {
    const children = group.options.map((option, index) => ({ id: option.id, dropdown_id: group.id, label: option.label, value: option.value, is_enabled: option.is_enabled, display_order: index }))
    if (children.length) {
      const result = await adminClient.from('product_custom_dropdown_options').upsert(children, { onConflict: 'id' })
      if (result.error) return { error: result.error.message }
    }
    const keep = children.map((row) => row.id)
    let stale = adminClient.from('product_custom_dropdown_options').delete().eq('dropdown_id', group.id)
    if (keep.length) stale = stale.not('id', 'in', `(${keep.join(',')})`)
    const staleResult = await stale
    if (staleResult.error) return { error: staleResult.error.message }
  }
  const keepParents = parentRows.map((row) => row.id)
  let staleParents = adminClient.from('product_custom_dropdowns').delete().eq('product_id', productId)
  if (keepParents.length) staleParents = staleParents.not('id', 'in', `(${keepParents.join(',')})`)
  const staleParentResult = await staleParents
  return staleParentResult.error ? { error: staleParentResult.error.message } : { error: null }
}
