import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MyBookingsList } from '@/components/bookings/my-bookings-list'

export const metadata = {
  title: 'My Bookings | Parent Dashboard',
}

export default async function ParentBookingsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const res = await payload.find({
    collection: 'bookings',
    where: { parent: { equals: user.id } },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })

  const bookings = JSON.parse(JSON.stringify(res.docs))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-tutor-purple-600">Parent Dashboard</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">My Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Track the tutors you&apos;ve booked for your children and manage their status.
        </p>
      </div>

      <MyBookingsList role="parent" bookings={bookings} />
    </div>
  )
}
