'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { headers as getHeaders } from 'next/headers'

export async function createClassAction(data: { title: string, subject: string, description: string }) {
    try {
        const payload = await getPayload({ config })
        const headers = await getHeaders()
        const { user } = await payload.auth({ headers })
        
        if (!user || user.accountType !== 'tutor') {
            return { error: 'Not authorized. You must be logged in as a tutor.' }
        }

        const { docs: tutorProfiles } = await payload.find({
            collection: 'tutor-profiles',
            where: { user: { equals: user.id } },
            depth: 0,
        })
        const tutorProfile = tutorProfiles[0]

        if (!tutorProfile) {
            return { error: 'Tutor profile not found. Please complete your profile.' }
        }

        const newClass = await payload.create({
            collection: 'classes',
            data: {
                title: data.title,
                description: data.description,
                subject: data.subject, // Assuming it's the subject ID
                tutorProfile: tutorProfile.id,
                user: user.id,
                type: 'one-on-one',
                isPublished: false,
            }
        })

        revalidatePath('/dashboard/tutor/classes')

        return { success: true, id: newClass.id }
    } catch (error: any) {
        console.error('Error creating class:', error)
        return { error: error.message || 'Failed to create class. Please ensure you selected a valid subject.' }
    }
}