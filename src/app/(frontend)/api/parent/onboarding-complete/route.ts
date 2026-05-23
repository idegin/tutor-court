import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  }

  const { totalDocs } = await payload.find({
    collection: 'students',
    where: { parent: { equals: user.id } },
    limit: 1,
    depth: 0,
  })

  if (totalDocs === 0) {
    return NextResponse.json(
      { error: 'Add at least one child before completing onboarding.' },
      { status: 400 },
    )
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { hasCompletedOnboarding: true } as any,
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true })
}
