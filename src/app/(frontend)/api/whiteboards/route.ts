import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'

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

  try {
    const newWhiteboard = await payload.create({
      collection: 'whiteboards',
      data: {
        title,
        owner: user.id,
        class: classId || undefined,
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
