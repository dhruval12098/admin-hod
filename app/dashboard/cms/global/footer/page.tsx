'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function FooterEditor() {
  const [links, setLinks] = useState([
    { id: '1', label: 'Shop', url: '/shop' }
  ])
  const [hasChanges, setHasChanges] = useState(false)

  const handleSave = () => {
    console.log('Saving footer links:', links)
    setHasChanges(false)
    alert('Changes saved successfully!')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/cms/global"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Global
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Footer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage footer content and links</p>
        </div>

        <div className="max-w-2xl bg-white border border-border rounded-lg p-8 shadow-xs space-y-8">
          <div>
            <h3 className="font-jakarta text-base font-semibold text-foreground mb-4">Footer Links</h3>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={link.id} className="flex gap-4 items-center">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...links]
                        newLinks[index].label = e.target.value
                        setLinks(newLinks)
                        setHasChanges(true)
                      }}
                      placeholder="Link Label"
                      className="w-full rounded border border-border px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...links]
                        newLinks[index].url = e.target.value
                        setLinks(newLinks)
                        setHasChanges(true)
                      }}
                      placeholder="/link"
                      className="w-full rounded border border-border px-3 py-1.5 text-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setLinks(links.filter(l => l.id !== link.id))
                      setHasChanges(true)
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setLinks([...links, { id: Math.random().toString(), label: '', url: '' }])
                  setHasChanges(true)
                }}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium pt-2"
              >
                <Plus size={14} />
                Add Link
              </button>
            </div>
          </div>
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
