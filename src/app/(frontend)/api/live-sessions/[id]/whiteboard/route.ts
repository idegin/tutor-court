import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can update session whiteboard state.' }, { status: 403 })
  }

  const { id } = params

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { showWhiteboard, activeWhiteboard } = body

  try {
    const updated = await payload.update({
      collection: 'live-sessions',
      id,
      data: {
        showWhiteboard: !!showWhiteboard,
        activeWhiteboard: activeWhiteboard || null,
      } as any,
    })

    return NextResponse.json({ success: true, session: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
