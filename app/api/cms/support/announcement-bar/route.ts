import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsRelationalSnapshot, saveCmsRelational } from '@/lib/cms-relational-save'
export async function GET(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;try{const x=await loadCmsRelationalSnapshot(access.adminClient,'announcement');return NextResponse.json({section:x.parent??{section_key:'global_support_announcement_bar',is_active:true,autoplay:true,speed_ms:3000},items:x.items,revision:x.revision},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Unable to load the Announcement Bar.'},{status:503})}}
export async function POST(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return saveCmsRelational(access,'announcement',await request.json().catch(()=>null))}
