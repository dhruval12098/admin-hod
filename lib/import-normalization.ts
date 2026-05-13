import 'server-only'

type LookupRow = {
  id: string
  name: string
}

function stripDiacritics(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeImportValue(value: string | null | undefined) {
  const raw = stripDiacritics(String(value ?? ''))
    .replace(/&/g, ' and ')
    .replace(/[_/]+/g, ' ')
    .replace(/[-]+/g, ' ')
    .replace(/[.,()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return raw
}

export function buildNormalizedLookupMap<T extends LookupRow>(rows: T[] | null | undefined) {
  const map = new Map<string, T>()

  for (const row of rows ?? []) {
    const normalized = normalizeImportValue(row.name)
    if (normalized && !map.has(normalized)) {
      map.set(normalized, row)
    }
  }

  return map
}

export function buildNormalizedLookupSet(rows: Array<{ name: string }> | null | undefined) {
  return new Set((rows ?? []).map((row) => normalizeImportValue(row.name)).filter(Boolean))
}
