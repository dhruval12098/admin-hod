'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { ProductMetalVariant } from '@/lib/product-catalog'

export function ProductMetalOptionsCard({
  metalVariants,
  setMetalVariants,
  getMetalVariantLabel,
  setDefaultMetalVariant,
  inputClassName,
}: {
  metalVariants: ProductMetalVariant[]
  setMetalVariants: Dispatch<SetStateAction<ProductMetalVariant[]>>
  getMetalVariantLabel: (metalId: string) => string
  setDefaultMetalVariant: (metalId: string) => void
  inputClassName: string
}) {
  return (
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
  )
}
