import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Payload CMS uses 'payload-token' by default
  const token = request.cookies.get('payload-token')

  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/tutor-onboarding') || 
    request.nextUrl.pathname.startsWith('/dashboard')

  // If user is trying to access a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/auth/login', request.url)
    
    // Optional: Include redirect param so user can go back to where they were going
    // loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/tutor-onboarding/:path*',
    '/dashboard/:path*'
  ],
}
