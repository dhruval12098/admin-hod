import { createSupabaseAdminClient } from '@/lib/admin-supabase'

export type AdminCustomerUser = {
  id: string
  email: string | null
  name: string
  createdAt: string
  confirmed: boolean
}

export async function getAdminCustomerUsers(): Promise<AdminCustomerUser[]> {
  const supabase = createSupabaseAdminClient()
  const users: AdminCustomerUser[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw new Error(error.message)
    }

    const batch = (data.users ?? []).map((user) => {
      const metadata = user.user_metadata ?? {}
      const rawUsername = typeof metadata.username === 'string' ? metadata.username.trim() : ''
      const rawFullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
      const fallbackName = user.email?.split('@')[0] ?? 'Unnamed user'

      return {
        id: user.id,
        email: user.email ?? null,
        name: rawUsername || rawFullName || fallbackName,
        createdAt: user.created_at ?? new Date().toISOString(),
        confirmed: Boolean(user.email_confirmed_at),
      }
    })

    users.push(...batch)

    if (batch.length < perPage) break
    page += 1
  }

  return users
}
