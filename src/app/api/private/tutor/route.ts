import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth'

export async function PATCH(request: Request) {
    try {
        const { user } = await getServerSideUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const data = await request.json()
        const { subjects, yearsOfExperience, bio, hourlyRate, mode, usagePlan, onboardingCompleted, type, minAge, maxAge } = data

        const payload = await getPayload({ config })

        // Find existing tutor profile for this user
        const { docs: existingProfiles } = await payload.find({
            collection: 'tutor-profiles',
            where: { user: { equals: user.id } },
            limit: 1,
            overrideAccess: true,
        })

        const updateData: any = {}
        if (subjects !== undefined) updateData.subjects = subjects
        if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience
        if (bio !== undefined) updateData.bio = bio
        if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate
        if (mode !== undefined) updateData.mode = mode
        if (usagePlan !== undefined) updateData.usagePlan = usagePlan
        if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted
        if (type !== undefined) updateData.type = type
        if (minAge !== undefined) updateData.minAge = minAge
        if (maxAge !== undefined) updateData.maxAge = maxAge

        let tutorProfile
        if (existingProfiles.length > 0) {
            tutorProfile = await payload.update({
                collection: 'tutor-profiles',
                id: existingProfiles[0].id,
                data: updateData,
                overrideAccess: true,
            })
        } else {
            tutorProfile = await payload.create({
                collection: 'tutor-profiles',
                data: {
                    user: user.id,
                    ...updateData
                },
                overrideAccess: true,
            })
        }

        // Update the user accountType to tutor if they aren't already
        if (user.accountType !== 'tutor') {
            await payload.update({
                collection: 'users',
                id: user.id,
                data: {
                    accountType: 'tutor'
                },
                overrideAccess: true,
            })
        }

        return NextResponse.json({ tutorProfile })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
