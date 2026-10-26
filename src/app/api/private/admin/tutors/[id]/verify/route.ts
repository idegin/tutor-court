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
        const { verified } = await request.json()

        const payload = await getPayload({ config })
        const requestHeaders = await getHeaders()

        const tutorProfile = await payload.findByID({
            collection: 'tutor-profiles',
            id,
            depth: 1,
            overrideAccess: true,
        }) as any

        if (!tutorProfile) {
            return NextResponse.json({ error: 'Tutor profile not found' }, { status: 404 })
        }

        await payload.update({
            collection: 'tutor-profiles',
            id,
            data: { isVerified: verified } as any,
            overrideAccess: true,
        })

        const tutorUserId = typeof tutorProfile.user === 'object'
            ? tutorProfile.user?.id
            : tutorProfile.user

        if (verified) {
            await emailUserById(
                payload,
                tutorUserId,
                'Your TutorCourt profile is now verified',
                'You\'ve been verified!',
                `<p class="text">Congratulations! The TutorCourt team has reviewed your profile and awarded you a <strong>Verified</strong> badge. This badge will now appear on your public profile, helping students trust and choose you with confidence.</p>
                <p class="text">Keep up the great work, and thank you for being part of the TutorCourt community.</p>`,
                { link: `/tutors/${tutorProfile.slug}`, linkLabel: 'View My Profile', headers: requestHeaders },
            )
        } else {
            await emailUserById(
                payload,
                tutorUserId,
                'Update to your TutorCourt profile',
                'Your verified status has changed',
                `<p class="text">We wanted to let you know that the Verified badge has been removed from your TutorCourt profile. This may be due to a routine review or a request for profile updates.</p>
                <p class="text">If you have any questions or would like to request re-verification, please reach out to our support team.</p>`,
                { link: '/dashboard/tutor', linkLabel: 'Go to Dashboard', headers: requestHeaders },
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POST /api/private/admin/tutors/[id]/verify]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
