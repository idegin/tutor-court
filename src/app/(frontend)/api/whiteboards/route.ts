import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { toIntId } from '@/lib/id'

// List whiteboards (with their slides) for a class. Used by the classroom client
// to refresh its list when the tutor shares a board that was created after the
// student loaded the page.
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const classId = toIntId(searchParams.get('classId'))
  if (!classId) {
    return NextResponse.json({ error: 'A valid classId is required.' }, { status: 400 })
  }

  try {
    // Authorize: only the class tutor or an enrolled student/parent may list boards.
    const cls = await payload.findByID({ collection: 'classes', id: classId, depth: 0 })
    if (!cls) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }
    const tutorId = typeof cls.tutor === 'object' ? (cls.tutor as any).id : cls.tutor
    const studentIds = (cls.students || []).map((s: any) => (typeof s === 'object' ? s.id : s))
    const parentIds = ((cls as any).parents || []).map((p: any) => (typeof p === 'object' ? p.id : p))
    const authorized =
      user.accountType === 'admin' ||
      user.id === tutorId ||
      studentIds.includes(user.id) ||
      parentIds.includes(user.id)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const whiteboardsRes = await payload.find({
      collection: 'whiteboards',
      where: { class: { equals: classId } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })

    const whiteboards: any[] = []
    for (const wb of whiteboardsRes.docs) {
      const slidesRes = await payload.find({
        collection: 'whiteboard-slides',
        where: { whiteboard: { equals: wb.id } },
        sort: 'order',
        limit: 100,
        depth: 0,
      })
      whiteboards.push({ ...wb, slides: slidesRes.docs })
    }

    return NextResponse.json({ whiteboards })
  } catch (error: any) {
    console.error('[whiteboards GET] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { title, classId } = body
  if (!title) {
    return NextResponse.json({ error: 'Whiteboard title is required.' }, { status: 400 })
  }
  // classId is optional, but if supplied it must be a valid integer id — a raw
  // string would fail Payload's relationship validation.
  const numericClassId = classId != null ? toIntId(classId) : null
  if (classId != null && !numericClassId) {
    return NextResponse.json({ error: 'Invalid classId.' }, { status: 400 })
  }

  try {
    const newWhiteboard = await payload.create({
      collection: 'whiteboards',
      data: {
        title,
        owner: user.id,
        class: numericClassId ?? undefined,
        isPublic: false,
        shareToken: crypto.randomBytes(16).toString('hex'),
      } as any,
    })

    // Create the first slide
    await payload.create({
      collection: 'whiteboard-slides',
      data: {
        whiteboard: newWhiteboard.id,
        order: 0,
        title: 'Slide 1',
        data: { lines: [] },
      } as any,
    })

    return NextResponse.json({ success: true, whiteboard: newWhiteboard })
  } catch (error: any) {
    console.error('[whiteboards POST] error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
