import { cache } from 'react'
import { createSupabaseServerSessionClient } from '@/lib/server-supabase'

export type AdminServerSession = {
  userId: string
  email: string | null
  role: string
}

export const getAdminServerSession = cache(async (): Promise<AdminServerSession | null> => {
  const supabase = await createSupabaseServerSessionClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return null
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role,
  }
})
