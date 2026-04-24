'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function BespokePricingEditor() {
  const [pricingTiers, setPricingTiers] = useState([
    { id: '1', title: 'Consultation', price: 'Free', features: 'Initial discussion' }
  ])
  const [hasChanges, setHasChanges] = useState(false)

  const handleSave = () => {
    console.log('Saving pricing tiers:', pricingTiers)
    setHasChanges(false)
    alert('Changes saved successfully!')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/cms/bespoke"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Bespoke
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Pricing Guide</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage bespoke pricing information</p>
        </div>

        <div className="max-w-4xl space-y-4">
          {pricingTiers.map((tier, index) => (
            <div key={tier.id} className="bg-white border border-border rounded-lg p-6 shadow-xs relative">
              <button 
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => {
                  setPricingTiers(pricingTiers.filter(t => t.id !== tier.id))
                  setHasChanges(true)
                }}
              >
                <Trash2 size={18} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Service/Tier Title</label>
                  <input
                    type="text"
                    value={tier.title}
                    onChange={(e) => {
                      const newTiers = [...pricingTiers]
                      newTiers[index].title = e.target.value
                      setPricingTiers(newTiers)
                      setHasChanges(true)
                    }}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Price Info</label>
                  <input
                    type="text"
                    value={tier.price}
                    onChange={(e) => {
                      const newTiers = [...pricingTiers]
                      newTiers[index].price = e.target.value
                      setPricingTiers(newTiers)
                      setHasChanges(true)
                    }}
                    placeholder="e.g., from £500"
                    className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">Features/Description</label>
                  <textarea
                    value={tier.features}
                    onChange={(e) => {
                      const newTiers = [...pricingTiers]
                      newTiers[index].features = e.target.value
                      setPricingTiers(newTiers)
                      setHasChanges(true)
                    }}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              setPricingTiers([...pricingTiers, { id: Math.random().toString(), title: '', price: '', features: '' }])
              setHasChanges(true)
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-all w-full justify-center"
          >
            <Plus size={16} />
            Add Pricing Tier
          </button>
        </div>

        {hasChanges && (
          <div className="mt-10 flex gap-3 fixed bottom-8 right-8">
            <button
              onClick={() => setHasChanges(false)}
              className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
