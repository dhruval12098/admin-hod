import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsRelationalSnapshot, saveCmsRelational } from '@/lib/cms-relational-save'
export async function GET(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;try{const x=await loadCmsRelationalSnapshot(access.adminClient,'summary');return NextResponse.json({section:x.parent,pointers:x.items,revision:x.revision},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Unable to load Summary content.'},{status:503})}}
export async function POST(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return saveCmsRelational(access,'summary',await request.json().catch(()=>null))}
