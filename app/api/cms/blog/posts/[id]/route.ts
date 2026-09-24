import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { deleteCmsArticle, loadCmsArticle, saveCmsArticle } from '@/lib/cms-article-save'

async function readPostId(params: Promise<{ id: string }>) {
  const postId = Number((await params).id)
  return Number.isSafeInteger(postId) && postId > 0 ? postId : null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const postId = await readPostId(params)
  if (!postId) return NextResponse.json({ error: 'Invalid blog id.' }, { status: 400 })
  return loadCmsArticle(access, 'blog', postId)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const postId = await readPostId(params)
  if (!postId) return NextResponse.json({ error: 'Invalid blog id.' }, { status: 400 })
  return saveCmsArticle(access, 'blog', postId, await request.json().catch(() => null))
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const postId = await readPostId(params)
  if (!postId) return NextResponse.json({ error: 'Invalid blog id.' }, { status: 400 })
  return deleteCmsArticle(access, 'blog', postId, await request.json().catch(() => null))
}
