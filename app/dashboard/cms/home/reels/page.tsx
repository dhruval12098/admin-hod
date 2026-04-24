'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function ReelsEditor() {
  const [reels, setReels] = useState([
    { id: 1, label: 'Collection Showcase', videoUrl: 'https://instagram.com/p/...' },
    { id: 2, label: 'Behind the Scenes', videoUrl: 'https://instagram.com/p/...' },
  ])

  const handleReelChange = (id: number, field: 'label' | 'videoUrl', value: string) => {
    setReels((prev) =>
      prev.map((reel) => (reel.id === id ? { ...reel, [field]: value } : reel))
    )
  }

  const handleAddReel = () => {
    const newId = Math.max(...reels.map((r) => r.id), 0) + 1
    setReels((prev) => [...prev, { id: newId, label: '', videoUrl: '' }])
  }

  const handleDeleteReel = (id: number) => {
    setReels((prev) => prev.filter((reel) => reel.id !== id))
  }

  const handleSave = () => {
    console.log('Saving reels:', reels)
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
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Instagram Reels</h1>
        <p className="mt-1 text-sm text-muted-foreground">Embed Instagram reels on the home page</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Reels List */}
        <div className="space-y-4">
          {reels.map((reel) => (
            <div key={reel.id} className="border border-border rounded-lg bg-white p-5 shadow-xs space-y-3">
              <input
                type="text"
                value={reel.label}
                onChange={(e) => handleReelChange(reel.id, 'label', e.target.value)}
                placeholder="Reel label (e.g., Collection Showcase)"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Instagram URL or Embed Code</label>
                <textarea
                  value={reel.videoUrl}
                  onChange={(e) => handleReelChange(reel.id, 'videoUrl', e.target.value)}
                  placeholder="https://instagram.com/p/... or iframe embed code"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => handleDeleteReel(reel.id)}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddReel}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={16} />
          Add Reel
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
