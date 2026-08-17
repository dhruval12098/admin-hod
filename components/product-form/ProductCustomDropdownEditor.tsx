'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { PillToggle } from './ProductFormControls'
import type { ProductCustomDropdown } from '@/lib/product-custom-dropdowns'

const inputClass = 'h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const uuid = () => crypto.randomUUID()

export function ProductCustomDropdownEditor({ enabled, onEnabledChange, groups, onChange }: { enabled: boolean; onEnabledChange: (value: boolean) => void; groups: ProductCustomDropdown[]; onChange: (groups: ProductCustomDropdown[]) => void }) {
  const addGroup = () => onChange([...groups, { id: uuid(), name: '', label: '', is_enabled: true, is_required: false, display_order: groups.length, options: [{ id: uuid(), label: '', value: '', is_enabled: true, display_order: 0 }] }])
  const updateGroup = (index: number, patch: Partial<ProductCustomDropdown>) => onChange(groups.map((group, i) => i === index ? { ...group, ...patch } : group))
  const move = (index: number, offset: number) => { const next = [...groups]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next) }

  return <div className="rounded-lg border border-border bg-secondary/10 p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold">Custom Product Dropdowns</p><p className="mt-2 text-xs text-muted-foreground">Create product-specific choices shown as dropdowns on the product page.</p></div>
      <PillToggle value={enabled} onChange={onEnabledChange} onLabel="Enabled" offLabel="Disabled" />
    </div>
    {enabled ? <div className="mt-5 space-y-4">
      {groups.length ? groups.map((group, groupIndex) => <div key={group.id} className="rounded-md border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold">Dropdown {groupIndex + 1}</p><div className="flex gap-1">
          <button type="button" aria-label="Move up" onClick={() => move(groupIndex, -1)} disabled={!groupIndex} className="rounded border p-2 disabled:opacity-30"><ArrowUp size={14}/></button>
          <button type="button" aria-label="Move down" onClick={() => move(groupIndex, 1)} disabled={groupIndex === groups.length - 1} className="rounded border p-2 disabled:opacity-30"><ArrowDown size={14}/></button>
          <button type="button" aria-label="Remove dropdown" onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))} className="rounded border p-2 text-destructive"><Trash2 size={14}/></button>
        </div></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Internal name<input className={`${inputClass} mt-1`} value={group.name} onChange={(e) => updateGroup(groupIndex, { name: e.target.value })} placeholder="chain_style" /></label><label className="text-xs font-medium">Customer label<input className={`${inputClass} mt-1`} value={group.label} onChange={(e) => updateGroup(groupIndex, { label: e.target.value })} placeholder="Select Chain Style" /></label></div>
        <div className="mt-3 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={group.is_enabled} onChange={(e) => updateGroup(groupIndex, { is_enabled: e.target.checked })}/> Enabled</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={group.is_required} onChange={(e) => updateGroup(groupIndex, { is_required: e.target.checked })}/> Required</label></div>
        <div className="mt-4 space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options</p>{group.options.map((option, optionIndex) => <div key={option.id} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
          <input aria-label="Option label" className={inputClass} value={option.label} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((row, i) => i === optionIndex ? { ...row, label: e.target.value } : row) })} placeholder="Option label"/>
          <input aria-label="Option value" className={inputClass} value={option.value} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((row, i) => i === optionIndex ? { ...row, value: e.target.value } : row) })} placeholder="option-value"/>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={option.is_enabled} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((row, i) => i === optionIndex ? { ...row, is_enabled: e.target.checked } : row) })}/> Enabled</label>
          <div className="flex gap-1"><button type="button" aria-label="Move option up" disabled={!optionIndex} className="rounded border p-2 disabled:opacity-30" onClick={() => { const options = [...group.options]; [options[optionIndex - 1], options[optionIndex]] = [options[optionIndex], options[optionIndex - 1]]; updateGroup(groupIndex, { options }) }}><ArrowUp size={14}/></button><button type="button" aria-label="Move option down" disabled={optionIndex === group.options.length - 1} className="rounded border p-2 disabled:opacity-30" onClick={() => { const options = [...group.options]; [options[optionIndex], options[optionIndex + 1]] = [options[optionIndex + 1], options[optionIndex]]; updateGroup(groupIndex, { options }) }}><ArrowDown size={14}/></button></div>
          <button type="button" aria-label="Remove option" className="rounded border p-2 text-destructive" onClick={() => updateGroup(groupIndex, { options: group.options.filter((_, i) => i !== optionIndex) })}><Trash2 size={14}/></button>
        </div>)}<button type="button" className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium" onClick={() => updateGroup(groupIndex, { options: [...group.options, { id: uuid(), label: '', value: '', is_enabled: true, display_order: group.options.length }] })}><Plus size={14}/> Add option</button></div>
      </div>) : <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">No dropdowns yet. Add one to create a customer-selectable product option.</div>}
      <button type="button" onClick={addGroup} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold"><Plus size={15}/> Add dropdown</button>
    </div> : null}
  </div>
}
