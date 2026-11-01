import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'
import { emailUserById } from '@/lib/transactional-email'
import { headers as getHeaders } from 'next/headers'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { user } = await getServerSideUser()
        if (!user || user.accountType !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const { suspend, reason } = await request.json()

        const payload = await getPayload({ config })
        const requestHeaders = await getHeaders()

        const targetUser = await payload.findByID({
            collection: 'users',
            id,
            depth: 0,
            overrideAccess: true,
        }) as any

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Prevent admins from suspending other admins
        if (targetUser.accountType === 'admin') {
            return NextResponse.json({ error: 'Cannot suspend an admin account' }, { status: 403 })
        }

        await payload.update({
            collection: 'users',
            id,
            data: { isActive: !suspend } as any,
            overrideAccess: true,
        })

        const firstName = targetUser.firstName || 'there'

        if (suspend) {
            const reasonNote = reason?.trim()
                ? `<p class="text" style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;color:#991b1b;">"${reason.trim()}"</p>`
                : ''

            await emailUserById(
                payload,
                id,
                'Your TutorCourt account has been suspended',
                'Your account has been suspended',
                `<p class="text">Hi ${firstName},</p>
                <p class="text">We've suspended your TutorCourt account for violating our community guidelines.</p>
                ${reasonNote}
                <p class="text">If you believe this is a mistake, please reach out to our support team and we'll review your case as quickly as possible.</p>`,
                { link: 'mailto:support@tutorcourt.com', linkLabel: 'Contact Support', headers: requestHeaders },
            )
        } else {
            await emailUserById(
                payload,
                id,
                'Your TutorCourt account has been reinstated',
                'Welcome back! 🎉',
                `<p class="text">Hi ${firstName},</p>
                <p class="text">Your TutorCourt account has been reinstated. You can now log in and continue using the platform as normal.</p>
                <p class="text">Thank you for your patience, and welcome back to the TutorCourt community.</p>`,
                { link: '/auth/login', linkLabel: 'Go to Login', headers: requestHeaders },
            )
        }

        return NextResponse.json({ success: true, suspended: suspend })
    } catch (error: any) {
        console.error('[POST /api/private/admin/users/[id]/suspend]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
