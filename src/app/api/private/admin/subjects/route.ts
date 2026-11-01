import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

export async function GET() {
    try {
        const { user } = await getServerSideUser()
        if (!user || user.accountType !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = await getPayload({ config })

        const [subjects, categories] = await Promise.all([
            payload.find({
                collection: 'subjects',
                limit: 500,
                sort: 'name',
                depth: 1,
                overrideAccess: true,
            }),
            payload.find({
                collection: 'subject-categories',
                limit: 200,
                sort: 'name',
                depth: 0,
                overrideAccess: true,
            }),
        ])

        return NextResponse.json({
            subjects: subjects.docs,
            categories: categories.docs,
            totalDocs: subjects.totalDocs,
        })
    } catch (error: any) {
        console.error('[GET /api/private/admin/subjects]', error?.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await getServerSideUser()
        if (!user || user.accountType !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, category, gradeLevels, shortDescription, isPopular, icon, color } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
        }
        if (!category) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 })
        }

        const payload = await getPayload({ config })

        const subject = await payload.create({
            collection: 'subjects',
            data: {
                name: name.trim(),
                category,
                gradeLevels: gradeLevels || [],
                ...(shortDescription != null ? { shortDescription } : {}),
                ...(isPopular != null ? { isPopular } : {}),
                ...(icon != null ? { icon } : {}),
                ...(color != null ? { color } : {}),
            } as any,
            overrideAccess: true,
        })

        return NextResponse.json({ subject }, { status: 201 })
    } catch (error: any) {
        console.error('[POST /api/private/admin/subjects]', error?.message)
        if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
            return NextResponse.json({ error: 'A subject with this name already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
