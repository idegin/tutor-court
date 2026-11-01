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
        const { amount, note } = await request.json()

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 })
        }

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

        const tutorUser = await payload.findByID({
            collection: 'users',
            id: tutorUserId,
            depth: 0,
            overrideAccess: true,
        }) as any

        if (!tutorUser) {
            return NextResponse.json({ error: 'Tutor user not found' }, { status: 404 })
        }

        // Find or create the tutor's wallet
        const { docs: wallets } = await payload.find({
            collection: 'wallets',
            where: { user: { equals: tutorUserId } },
            limit: 1,
            overrideAccess: true,
        })

        let wallet = wallets[0] as any

        if (!wallet) {
            wallet = await payload.create({
                collection: 'wallets',
                data: {
                    user: tutorUserId,
                    currency: 'ngn',
                    balance: 0,
                    lockedBalance: 0,
                    creditBalance: amount,
                },
                overrideAccess: true,
            })
        } else {
            const newBalance = (wallet.creditBalance || 0) + amount
            await payload.update({
                collection: 'wallets',
                id: wallet.id,
                data: { creditBalance: newBalance } as any,
                overrideAccess: true,
            })
        }

        const tutorName = `${tutorUser.firstName || ''}`.trim() || 'there'
        const noteHtml = note
            ? `<p class="text" style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;border-radius:0 8px 8px 0;color:#166534;font-style:italic;">"${note}"</p>`
            : ''

        await emailUserById(
            payload,
            tutorUserId,
            `You've received ${amount.toLocaleString()} credits on TutorCourt!`,
            `🎉 You've got credits, ${tutorName}!`,
            `<p class="text">Great news — the TutorCourt team has added <strong>${amount.toLocaleString()} credits</strong> to your account. These credits can be used directly for live tutoring sessions on the platform.</p>
            ${noteHtml}
            <p class="text">Your credits are available immediately. Head to your dashboard to see your updated balance and start using them.</p>`,
            { link: '/dashboard/tutor/wallet', linkLabel: 'View My Wallet', headers: requestHeaders },
        )

        return NextResponse.json({ success: true, amount })
    } catch (error: any) {
        console.error('[POST /api/private/admin/tutors/[id]/credit]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
