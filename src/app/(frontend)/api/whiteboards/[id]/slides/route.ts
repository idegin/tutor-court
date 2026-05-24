import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const { id } = params

  try {
    const slidesRes = await payload.find({
      collection: 'whiteboard-slides',
      where: { whiteboard: { equals: id } },
      sort: 'order',
      limit: 100,
      depth: 0,
    })

    return NextResponse.json({ slides: slidesRes.docs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  const { id } = params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const whiteboard = await payload.findByID({
      collection: 'whiteboards',
      id,
      depth: 0,
    })

    if (!whiteboard) {
      return NextResponse.json({ error: 'Whiteboard not found' }, { status: 404 })
    }

    const ownerId = typeof whiteboard.owner === 'object' ? whiteboard.owner?.id : whiteboard.owner
    if (ownerId !== user.id && user.accountType !== 'admin') {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
