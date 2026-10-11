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
        const { approved, rejectionReason, revoke } = await request.json()

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

        const tutorUserId = typeof tutorProfile.user === 'object'
            ? tutorProfile.user?.id
            : tutorProfile.user

        if (approved) {
            await payload.update({
                collection: 'tutor-profiles',
                id,
                data: { isApproved: true } as any,
                overrideAccess: true,
            })

            await emailUserById(
                payload,
                tutorUserId,
                "You're live on TutorCourt — welcome!",
                "You're approved! 🎉",
                `<p class="text">Great news! Your TutorCourt profile has been reviewed and approved by our team. Students can now find and book you through the platform.</p>
                <p class="text">Here's what to do next:</p>
                <ul style="color:#4b5563; padding-left:20px; margin-bottom:24px;">
                    <li style="margin-bottom:8px;">Set your weekly availability in your dashboard</li>
                    <li style="margin-bottom:8px;">Create or update your classes</li>
                    <li style="margin-bottom:8px;">Complete any assessments you want to offer students</li>
                </ul>`,
                { link: '/dashboard/tutor', linkLabel: 'Go to Dashboard', headers: requestHeaders },
            )
        } else {
            // Revoke (already approved) just removes approval; the tutor keeps their completed
            // profile intact. Reject (pending application) resets onboarding so they can fix issues.
            const updateData: any = { isApproved: false, rejectionReason: rejectionReason || '' }
            if (!revoke) {
                updateData.onboardingCompleted = false
            }

            await payload.update({
                collection: 'tutor-profiles',
                id,
                data: updateData,
                overrideAccess: true,
            })

            const reasonHtml = rejectionReason
                ? `<div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:16px; margin-bottom:24px;">
                    <p style="margin:0; font-weight:600; color:#92400e;">Feedback from our team:</p>
                    <p style="margin:8px 0 0; color:#78350f;">${rejectionReason}</p>
                  </div>`
                : ''

            await emailUserById(
                payload,
                tutorUserId,
                'Your TutorCourt application needs attention',
                'Your profile needs a few updates',
                `<p class="text">Thanks for applying to tutor on TutorCourt. After reviewing your profile, our team has a few items they'd like you to address before we can approve you.</p>
                ${reasonHtml}
                <p class="text">Please log in, update your profile, and resubmit. Our team will review your application again as soon as possible.</p>`,
                { link: '/tutor-onboarding', linkLabel: 'Update My Profile', headers: requestHeaders },
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[POST /api/private/admin/tutors/[id]/approve]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
