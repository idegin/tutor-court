import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// One-time admin user bootstrap endpoint.
// Guards: only runs if SETUP_ADMIN_SECRET env var is set AND the request carries it,
// AND no admin user already exists (safe to leave deployed — it becomes a no-op).
export async function POST(request: Request) {
    const secret = process.env.SETUP_ADMIN_SECRET
    if (!secret) {
        return NextResponse.json({ error: 'Not available' }, { status: 404 })
    }

    const { secret: provided } = await request.json().catch(() => ({}))
    if (!provided || provided !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await getPayload({ config })

    const existing = await payload.find({
        collection: 'users',
        where: { accountType: { equals: 'admin' } },
        limit: 1,
        overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
        return NextResponse.json({
            message: 'Admin user already exists',
            email: (existing.docs[0] as any).email,
        })
    }

    await payload.create({
        collection: 'users',
        data: {
            email: 'admin@tutorcourt.com',
            password: 'Superman6625*',
            firstName: 'Super',
            lastName: 'Admin',
            phoneNumber: '+1234567890',
            accountType: 'admin',
            _verified: true,
        } as any,
        disableVerificationEmail: true,
        overrideAccess: true,
    })

    return NextResponse.json({ success: true, email: 'admin@tutorcourt.com' })
}
