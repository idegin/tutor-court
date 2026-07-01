import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'
import { getWhiteboardAccess } from '@/lib/whiteboard-access'

// Loads the slide and confirms it actually belongs to the whiteboard in the URL
// AND the caller may write to that whiteboard. Prevents editing/deleting another
// board's slide by pairing a board you own with a victim's slideId.
async function authorizeSlide(payload: any, whiteboardId: number, slideId: number, user: any) {
  const { whiteboard, canWrite } = await getWhiteboardAccess(payload, whiteboardId, user)
  if (!whiteboard) return { error: 'Whiteboard not found', status: 404 as const }
  if (!canWrite) {
    return { error: 'Forbidden: Only the owner of this whiteboard can modify slides', status: 403 as const }
  }
  const slide = await payload
    .findByID({ collection: 'whiteboard-slides', id: slideId, depth: 0 })
    .catch(() => null)
  if (!slide) return { error: 'Slide not found', status: 404 as const }
  const slideWhiteboardId =
    typeof slide.whiteboard === 'object' ? slide.whiteboard?.id : slide.whiteboard
  if (slideWhiteboardId !== whiteboardId) {
    return { error: 'Slide does not belong to this whiteboard.', status: 404 as const }
  }
  return { slide }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; slideId: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = toIntId(params.id)
  const slideId = toIntId(params.slideId)
  if (!id || !slideId) {
    return NextResponse.json({ error: 'Invalid whiteboard or slide id.' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    const auth = await authorizeSlide(payload, id, slideId, user)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const updatedSlide = await payload.update({
      collection: 'whiteboard-slides',
      id: slideId,
      data: {
        title: body.title !== undefined ? body.title : undefined,
        data: body.data !== undefined ? body.data : undefined,
        order: body.order !== undefined ? Number(body.order) : undefined,
      } as any,
    })

    return NextResponse.json({ success: true, slide: updatedSlide })
  } catch (error: any) {
    console.error('[whiteboards/slide PATCH] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; slideId: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = toIntId(params.id)
  const slideId = toIntId(params.slideId)
  if (!id || !slideId) {
    return NextResponse.json({ error: 'Invalid whiteboard or slide id.' }, { status: 400 })
  }

  try {
    const auth = await authorizeSlide(payload, id, slideId, user)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await payload.delete({
      collection: 'whiteboard-slides',
      id: slideId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[whiteboards/slide DELETE] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
