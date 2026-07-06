import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MyBookingsList } from '@/components/bookings/my-bookings-list'

export const metadata = {
  title: 'My Bookings | Student Dashboard',
}

export default async function StudentBookingsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) return null

  const res = await payload.find({
    collection: 'bookings',
    where: { student: { equals: user.id } },
    depth: 2,
    sort: '-createdAt',
    limit: 100,
  })

  const bookings = JSON.parse(JSON.stringify(res.docs))

  // Flag bookings that currently have an open dispute (freezes escrow; drives UI).
  const bookingIds = bookings.map((b: any) => b.id)
  if (bookingIds.length > 0) {
    const openDisputes = await payload.find({
      collection: 'disputes',
      where: { and: [{ booking: { in: bookingIds } }, { status: { equals: 'open' } }] },
      depth: 0,
      limit: 200,
      overrideAccess: true,
    })
    const disputed = new Set(
      openDisputes.docs.map((d: any) => String(typeof d.booking === 'object' ? d.booking.id : d.booking)),
    )
    bookings.forEach((b: any) => {
      b.hasOpenDispute = disputed.has(String(b.id))
    })
  }

  const walletRes = await payload.find({
    collection: 'wallets',
    where: { user: { equals: user.id } },
    limit: 1,
  })
  const wallet = walletRes.docs[0]
  const walletBalance = wallet ? (wallet.balance || 0) - (wallet.lockedBalance || 0) : 0

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-tutor-purple-600">Student Dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground">
          Track the tutors you&apos;ve booked and manage your requests.
        </p>
      </div>

      <MyBookingsList role="student" bookings={bookings} walletBalance={walletBalance} />
    </div>
  )
}
