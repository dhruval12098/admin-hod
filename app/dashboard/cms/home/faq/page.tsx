'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function FAQEditor() {
  const [faqs, setFaqs] = useState([
    { id: 1, question: 'What is your warranty?', answer: 'We offer a lifetime warranty on all pieces...' },
    { id: 2, question: 'Do you offer customization?', answer: 'Yes, we specialize in bespoke designs...' },
  ])

  const handleFaqChange = (id: number, field: 'question' | 'answer', value: string) => {
    setFaqs((prev) =>
      prev.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq))
    )
  }

  const handleAddFaq = () => {
    const newId = Math.max(...faqs.map((f) => f.id), 0) + 1
    setFaqs((prev) => [...prev, { id: newId, question: '', answer: '' }])
  }

  const handleDeleteFaq = (id: number) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id))
  }

  const handleSave = () => {
    console.log('Saving FAQs:', faqs)
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
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">FAQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage frequently asked questions</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-border rounded-lg bg-white p-5 shadow-xs space-y-3">
              <input
                type="text"
                value={faq.question}
                onChange={(e) => handleFaqChange(faq.id, 'question', e.target.value)}
                placeholder="Question"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                value={faq.answer}
                onChange={(e) => handleFaqChange(faq.id, 'answer', e.target.value)}
                placeholder="Answer"
                rows={4}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => handleDeleteFaq(faq.id)}
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
          onClick={handleAddFaq}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={16} />
          Add FAQ
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
