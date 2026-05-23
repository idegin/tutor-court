import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const payload = await getPayload({ config })
  const { id } = params

  try {
    const session = await payload.findByID({
      collection: 'live-sessions',
      id,
      depth: 0,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    return NextResponse.json({
      status: session.status,
      showWhiteboard: session.showWhiteboard || false,
      activeWhiteboard: session.activeWhiteboard || null,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
