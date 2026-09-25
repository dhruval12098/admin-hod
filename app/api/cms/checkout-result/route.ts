import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsRelationalSnapshot, saveCmsRelational } from '@/lib/cms-relational-save'

export async function GET(request: Request) {
  const access=await assertAdmin(request); if('error' in access)return access.error
  try { const snapshot=await loadCmsRelationalSnapshot(access.adminClient,'checkout_result'); const bucket=process.env.SUPABASE_COLLECTION_BUCKET??'hod'; const parent=snapshot.parent; const url=(path:unknown)=>typeof path==='string'&&path ? (/^https?:\/\//i.test(path)||path.startsWith('/')?path:access.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl):''; return NextResponse.json({page:parent?{...parent,main_banner_image_url:url(parent.main_banner_image_path),secondary_banner_image_url:url(parent.secondary_banner_image_path)}:null,states:snapshot.items,revision:snapshot.revision},{headers:{'Cache-Control':'no-store'}}) } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load this section.'},{status:500})}
}
export async function POST(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return saveCmsRelational(access,'checkout_result',await request.json().catch(()=>null))}
