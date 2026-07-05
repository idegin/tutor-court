import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'
import { getWhiteboardAccess, canDrawViaLiveSession } from '@/lib/whiteboard-access'

// Loads the slide and confirms it actually belongs to the whiteboard in the URL
// AND the caller may write to that whiteboard. Prevents editing/deleting another
// board's slide by pairing a board you own with a victim's slideId.
//
// `dataOnly` is true when the caller is not the owner/admin but is a student the
// tutor allowed to draw during a live session: they may update slide DATA
// (strokes) only — never the title, order, or deletion.
async function authorizeSlide(payload: any, whiteboardId: number, slideId: number, user: any) {
  const { whiteboard, canWrite } = await getWhiteboardAccess(payload, whiteboardId, user)
  if (!whiteboard) return { error: 'Whiteboard not found', status: 404 as const }

  let dataOnly = false
  if (!canWrite) {
    const drawGrant = await canDrawViaLiveSession(payload, whiteboard, user)
    if (!drawGrant) {
      return { error: 'Forbidden: Only the owner of this whiteboard can modify slides', status: 403 as const }
    }
    dataOnly = true
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
  return { slide, dataOnly }
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

    // Students granted live-session draw rights may only change stroke data —
    // never the slide's title or order.
    const updatedSlide = await payload.update({
      collection: 'whiteboard-slides',
      id: slideId,
      data: {
        title: !auth.dataOnly && body.title !== undefined ? body.title : undefined,
        data: body.data !== undefined ? body.data : undefined,
        order: !auth.dataOnly && body.order !== undefined ? Number(body.order) : undefined,
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
    // A live-session draw grant never allows deleting slides — owner/admin only.
    if (auth.dataOnly) {
      return NextResponse.json(
        { error: 'Forbidden: Only the owner of this whiteboard can delete slides' },
        { status: 403 },
      )
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
