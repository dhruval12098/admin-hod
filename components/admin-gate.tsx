'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_CACHE_KEY = 'admin_access_verified_until'
const ADMIN_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const cachedUntil = Number(localStorage.getItem(ADMIN_CACHE_KEY) ?? '0')
    if (cachedUntil > Date.now()) {
      setReady(true)
    }

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        localStorage.removeItem(ADMIN_CACHE_KEY)
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!active) return

      if (profile?.role !== 'admin') {
        localStorage.removeItem(ADMIN_CACHE_KEY)
        router.replace('/login')
        return
      }

      localStorage.setItem(ADMIN_CACHE_KEY, String(Date.now() + ADMIN_CACHE_TTL_MS))
      setReady(true)
    }

    if (!(cachedUntil > Date.now())) {
      verify()
    } else {
      void verify()
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.user) {
        localStorage.removeItem(ADMIN_CACHE_KEY)
        router.replace('/login')
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [router])

  if (!ready) {
    return <div className="h-screen bg-background" />
  }

  return <>{children}</>
}
