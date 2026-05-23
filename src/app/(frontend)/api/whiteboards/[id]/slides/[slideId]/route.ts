import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

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

  const { slideId } = params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  const { slideId } = params

  try {
    await payload.delete({
      collection: 'whiteboard-slides',
      id: slideId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
