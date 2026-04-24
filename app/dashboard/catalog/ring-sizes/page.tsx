'use client'

import { useState } from 'react'

const SIZES = Array.from({ length: 25 }, (_, index) => (3 + index * 0.5).toFixed(1).replace('.0', ''))
const DEFAULT_ENABLED = new Set(['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'])

export default function RingSizesPage() {
  const [enabledSizes, setEnabledSizes] = useState<string[]>(SIZES.filter((size) => DEFAULT_ENABLED.has(size)))

  const toggleSize = (size: string) => {
    setEnabledSizes((prev) => (prev.includes(size) ? prev.filter((item) => item !== size) : [...prev, size]))
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Ring Sizes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enable or disable global ring size options.</p>
      </div>

      <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {SIZES.map((size) => {
            const active = enabledSizes.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                  active ? 'bg-foreground text-white' : 'border border-border text-foreground hover:bg-secondary'
                }`}
              >
                Size {size}
              </button>
            )
          })}
        </div>

        <div className="mt-8">
          <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
