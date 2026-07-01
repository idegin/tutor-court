import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toIntId } from '@/lib/id'
import { getWhiteboardAccess } from '@/lib/whiteboard-access'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = toIntId(params.id)
  if (!id) {
    return NextResponse.json({ error: 'Invalid whiteboard id.' }, { status: 400 })
  }

  try {
    const { whiteboard, canRead } = await getWhiteboardAccess(payload, id, user)
    if (!whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 })
    }
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const slidesRes = await payload.find({
      collection: 'whiteboard-slides',
      where: { whiteboard: { equals: id } },
      sort: 'order',
      limit: 100,
      depth: 0,
    })

    return NextResponse.json({ slides: slidesRes.docs })
  } catch (error: any) {
    console.error('[whiteboards/slides GET] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = toIntId(params.id)
  if (!id) {
    return NextResponse.json({ error: 'Invalid whiteboard id.' }, { status: 400 })
  }

  try {
    const { whiteboard, canWrite } = await getWhiteboardAccess(payload, id, user)
    if (!whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 })
    }
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden: Only the owner of this whiteboard can add slides' }, { status: 403 })
    }

    // Find highest order slide to determine the order of the new slide
    const existingSlides = await payload.find({
      collection: 'whiteboard-slides',
      where: { whiteboard: { equals: id } },
      sort: '-order',
      limit: 1,
      depth: 0,
    })

    const nextOrder = existingSlides.docs.length > 0 ? (existingSlides.docs[0].order as number) + 1 : 0

    const newSlide = await payload.create({
      collection: 'whiteboard-slides',
      data: {
        whiteboard: id,
        order: nextOrder,
        title: `Slide ${nextOrder + 1}`,
        data: { lines: [] },
      } as any,
    })

    return NextResponse.json({ success: true, slide: newSlide })
  } catch (error: any) {
    console.error('[whiteboards/slides POST] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
