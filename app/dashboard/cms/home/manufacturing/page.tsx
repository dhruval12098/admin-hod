'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save, ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'

export default function ManufacturingEditor() {
  const [steps, setSteps] = useState([
    { id: 1, title: 'Design', description: 'Custom design consultation and creation' },
    { id: 2, title: 'Material Selection', description: 'Choose precious metals and gemstones' },
    { id: 3, title: 'Crafting', description: 'Handcrafted by expert artisans' },
  ])

  const handleStepChange = (id: number, field: 'title' | 'description', value: string) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, [field]: value } : step))
    )
  }

  const handleAddStep = () => {
    const newId = Math.max(...steps.map((s) => s.id), 0) + 1
    setSteps((prev) => [...prev, { id: newId, title: '', description: '' }])
  }

  const handleDeleteStep = (id: number) => {
    setSteps((prev) => prev.filter((step) => step.id !== id))
  }

  const handleSave = () => {
    console.log('Saving manufacturing steps:', steps)
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard/cms/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Manufacturing Steps</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add and manage the jewelry manufacturing process</p>
      </div>

      <div className="max-w-4xl space-y-6">
        <p className="text-sm text-muted-foreground">Drag items to reorder them</p>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="border border-border rounded-lg bg-white p-5 shadow-xs">
              <div className="flex gap-4">
                <div className="flex items-center justify-center">
                  <GripVertical size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="font-jakarta text-lg font-bold text-foreground min-w-8">{index + 1}</div>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => handleStepChange(step.id, 'title', e.target.value)}
                      placeholder="Step title"
                      className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <textarea
                    value={step.description}
                    onChange={(e) => handleStepChange(step.id, 'description', e.target.value)}
                    placeholder="Step description"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => handleDeleteStep(step.id)}
                  className="rounded-lg p-2 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddStep}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={16} />
          Add Step
        </button>

        {/* Save Buttons */}
        <div className="border-t border-border pt-6 flex gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors duration-200"
          >
            <Save size={18} />
            Save Changes
          </button>
          <Link
            href="/dashboard/cms/home"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors duration-200"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
