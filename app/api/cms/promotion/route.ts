import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsRelationalSnapshot, saveCmsRelational } from '@/lib/cms-relational-save'
export async function GET(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;try{const x=await loadCmsRelationalSnapshot(access.adminClient,'promotion');return NextResponse.json({item:x.parent?{...x.parent,questions:x.items}:null,revision:x.revision},{headers:{'Cache-Control':'no-store'}})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load this section.'},{status:500})}}
export async function POST(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return saveCmsRelational(access,'promotion',await request.json().catch(()=>null))}
