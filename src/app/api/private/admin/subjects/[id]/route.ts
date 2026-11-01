import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { user } = await getServerSideUser()
        if (!user || user.accountType !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, category, gradeLevels, shortDescription, isPopular, icon, color } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
        }

        const payload = await getPayload({ config })

        const subject = await payload.update({
            collection: 'subjects',
            id,
            data: {
                name: name.trim(),
                ...(category ? { category } : {}),
                ...(gradeLevels !== undefined ? { gradeLevels } : {}),
                ...(shortDescription !== undefined ? { shortDescription } : {}),
                ...(isPopular !== undefined ? { isPopular } : {}),
                ...(icon !== undefined ? { icon } : {}),
                ...(color !== undefined ? { color } : {}),
            } as any,
            overrideAccess: true,
        })

        return NextResponse.json({ subject })
    } catch (error: any) {
        console.error('[PATCH /api/private/admin/subjects/[id]]', error?.message)
        if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
            return NextResponse.json({ error: 'A subject with this name already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { user } = await getServerSideUser()
        if (!user || user.accountType !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const payload = await getPayload({ config })

        // Check if any tutor profile uses this subject
        const { totalDocs: tutorCount } = await payload.find({
            collection: 'tutor-profiles',
            where: { subjects: { in: [id] } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        })

        if (tutorCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete: ${tutorCount} tutor${tutorCount !== 1 ? 's' : ''} currently teach this subject. Reassign them first.` },
                { status: 409 },
            )
        }

        // Also check if any class uses this subject
        const { totalDocs: classCount } = await payload.find({
            collection: 'classes',
            where: { subject: { equals: id } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        })

        if (classCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete: ${classCount} class${classCount !== 1 ? 'es' : ''} use this subject.` },
                { status: 409 },
            )
        }

        await payload.delete({
            collection: 'subjects',
            id,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[DELETE /api/private/admin/subjects/[id]]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
