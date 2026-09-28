'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
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
        router.replace('/login')
        return
      }

      setReady(true)
    }

    void verify()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session?.user) {
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
