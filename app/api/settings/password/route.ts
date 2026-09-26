import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assertAdmin } from '@/lib/cms-auth'
import { passwordChangeSchema } from '@/lib/settings-validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid password details.' }, { status: 400 })
  if (!access.user.email) return NextResponse.json({ error: 'Your admin account does not have an email address.' }, { status: 400 })
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: 'Password changes are temporarily unavailable.' }, { status: 503 })

  const verifyClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInError } = await verifyClient.auth.signInWithPassword({ email: access.user.email, password: parsed.data.currentPassword })
  if (signInError) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })

  const { error: updateError } = await access.adminClient.auth.admin.updateUserById(access.user.id, { password: parsed.data.newPassword })
  if (updateError) return NextResponse.json({ error: 'Unable to update the password.' }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Password updated successfully. Please sign in again for a fresh session.' }, { headers: { 'Cache-Control': 'no-store' } })
}
