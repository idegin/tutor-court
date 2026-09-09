import { NextResponse } from 'next/server'

// Keep in sync with the auth cookie in src/collections/Users.ts
// (cookiePrefix `tutorcourt`) and the logout route.
const COOKIE_NAME = 'tutorcourt-token'

// Returns the standard 401 "session expired" response, but ALSO expires the
// stale auth cookie in the same response.
//
// Why: after the Vercel -> Fly + Mongo -> Postgres migration, some browsers hold
// a `tutorcourt-token` this server can no longer authenticate (minted under an
// old secret / different DB). `payload.auth()` returns no user, so the app shows
// pages but rejects any write with "session expired" — and simply logging in
// again didn't reliably fix it. Clearing the cookie here means the bad token is
// thrown out the moment it's rejected, so the next login starts clean.
export function sessionExpiredResponse() {
  const res = NextResponse.json(
    { error: 'Your session has expired. Please log in again.' },
    { status: 401 },
  )
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })
  return res
}
