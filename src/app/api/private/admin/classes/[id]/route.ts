import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

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

        await payload.delete({
            collection: 'classes',
            id,
            overrideAccess: true,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[DELETE /api/private/admin/classes/[id]]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
