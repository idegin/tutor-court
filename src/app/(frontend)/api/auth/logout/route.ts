import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Pin the Node runtime — we touch cookies via the Node headers API.
export const runtime = 'nodejs'

// Dedicated, unconditional logout.
//
// We deliberately do NOT proxy Payload's built-in POST /api/users/logout here.
// That endpoint only clears the auth cookie AFTER it re-authenticates the
// request (its logout operation throws `No User` / 400 when `req.user` is
// falsy, and the handler returns before emitting the expiring Set-Cookie). So
// any cookie Payload can no longer authenticate — e.g. a token minted under a
// different PAYLOAD_SECRET or against a different database after the Vercel ->
// Fly + Mongo -> Postgres migration — could never be cleared, leaving the user
// permanently "logged in" with no way to sign out.
//
// This route clears `tutorcourt-token` regardless of whether the token is still
// valid. The cookie attributes mirror the auth config in src/collections/Users.ts
// (cookiePrefix `tutorcourt`, sameSite `Lax`, secure in production, path `/`) so
// the browser reliably overwrites and expires the original cookie.
const COOKIE_NAME = 'tutorcourt-token'

export async function POST() {
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })

  return NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 })
}
