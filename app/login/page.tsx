'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f3ef]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(17,17,17,0.06),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(17,17,17,0.08),transparent_30%),linear-gradient(135deg,#f8f6f1_0%,#f3efe8_48%,#ece7df_100%)]" />
        <div className="absolute left-[8%] top-[14%] h-44 w-44 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-56 w-56 rounded-full bg-black/6 blur-3xl" />

        <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_minmax(420px,520px)]">
          <section className="hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2d2d2d] backdrop-blur-sm">
                <ShieldCheck size={15} className="text-[#111111]" />
                House of Diams Admin
              </div>

              <div className="mt-12 max-w-[560px]">
                <p className="text-[12px] font-medium uppercase tracking-[0.28em] text-[#746e66]">
                  Operations Console
                </p>
                <h1 className="mt-5 max-w-[10ch] font-jakarta text-[clamp(3.2rem,6vw,5.6rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-[#111111]">
                  A calmer way to run the admin.
                </h1>
                <p className="mt-7 max-w-[44ch] text-[16px] leading-7 text-[#5f5a53]">
                  Sign in to manage products, catalog structure, navigation, and content from one clean workspace designed for speed and clarity.
                </p>
              </div>
            </div>

            <div className="grid max-w-[620px] gap-4 xl:grid-cols-3">
              {[
                {
                  title: 'Catalog Control',
                  body: 'Update categories, subcategories, metals, shapes, and options from one connected admin flow.',
                },
                {
                  title: 'Product Accuracy',
                  body: 'Keep product details, specifications, media, and storefront-facing fields in sync.',
                },
                {
                  title: 'Navigation Rules',
                  body: 'Shape the menu structure with direct data sources instead of hidden hardcoded behavior.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[26px] border border-black/8 bg-white/72 p-5 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-[#666057]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
            <div className="w-full max-w-[470px] rounded-[30px] border border-black/8 bg-white/86 p-6 shadow-[0_30px_90px_rgba(17,17,17,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b847b]">
                    Secure Access
                  </p>
                  <h2 className="mt-3 font-jakarta text-[2rem] font-semibold tracking-[-0.04em] text-[#111111]">
                    Admin Login
                  </h2>
                  <p className="mt-3 max-w-[34ch] text-sm leading-6 text-[#666057]">
                    Enter your admin credentials to access inventory, catalog, navigation, and CMS controls.
                  </p>
                </div>
                <div className="hidden rounded-2xl border border-black/8 bg-[#f6f4ef] p-3 sm:flex">
                  <LockKeyhole size={20} className="text-[#111111]" />
                </div>
              </div>

              <form onSubmit={signIn} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5d584f]">
                    Email Address
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 py-3.5 text-[15px] text-[#111111] outline-none transition-all placeholder:text-[#9d978d] focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@houseofdiams.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5d584f]">
                    Password
                  </label>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 py-3.5 text-[15px] text-[#111111] outline-none transition-all placeholder:text-[#9d978d] focus:border-black/30 focus:bg-white focus:ring-4 focus:ring-black/5"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>

                {message ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                  </div>
                ) : null}

                <button
                  disabled={isSubmitting}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111111] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in to Dashboard'}
                  {!isSubmitting ? (
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </form>

              <div className="mt-8 rounded-[24px] border border-black/8 bg-[#f8f6f1] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7f786f]">
                  Admin Access Only
                </p>
                <p className="mt-2 text-sm leading-6 text-[#666057]">
                  This interface is reserved for authenticated team members managing products, content, and navigation.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
