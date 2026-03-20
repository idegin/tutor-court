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

    const formData = await request.formData()
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const country = formData.get('country') as string
    const timezone = formData.get('timezone') as string
    const photo = formData.get('photo') as File | null

    const payload = await getPayload({ config })
    
    let avatarId = user.avatar
    if (photo && photo instanceof File && photo.size > 0) {
      const arrayBuffer = await photo.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const media = await payload.create({
        collection: 'media',
        data: {},
        file: {
          data: buffer,
          name: photo.name,
          mimetype: photo.type,
          size: photo.size,
        },
      })
      avatarId = media.id
    }

    const updateData: any = {}
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (phoneNumber) updateData.phoneNumber = phoneNumber
    if (country) updateData.country = country
    if (timezone) updateData.timezone = timezone
    if (avatarId && avatarId !== user.avatar) updateData.avatar = avatarId

    const updatedUser = await payload.update({
      collection: 'users',
      id: user.id,
      data: updateData,
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
