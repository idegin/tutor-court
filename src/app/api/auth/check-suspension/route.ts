import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Called by the login page after a failed login attempt to distinguish
// "wrong password" from "account suspended". Always returns 200 to avoid
// leaking account existence in a timing attack.
export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ suspended: false })
        }

        const payload = await getPayload({ config })

        const { docs } = await payload.find({
            collection: 'users',
            where: { email: { equals: email.toLowerCase().trim() } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        })

        const user = docs[0] as any
        const suspended = user ? user.isActive === false : false

        return NextResponse.json({ suspended })
    } catch {
        return NextResponse.json({ suspended: false })
    }
}
