import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

export function middleware(request: NextRequest) {
  // Payload CMS uses 'payload-token' by default
  const token = request.cookies.get('payload-token')

  const pathname = request.nextUrl.pathname;
  
  const isProtectedRoute = 
    pathname.startsWith('/tutor-onboarding') || 
    pathname.startsWith('/dashboard')

  const isAuthRoute = pathname.startsWith('/auth')

  // Decode the token locally to grab basic user data out of the JWT avoiding heavy database calls
  let accountType = null;
  if (token?.value) {
      try {
        const decoded = jwtDecode<any>(token.value);
        accountType = decoded?.accountType;
      } catch (err) {
        console.error("Error decoding token in middleware:", err)
      }
  }

  // If user is trying to access an auth route with a token, redirect to home
  if (isAuthRoute && token) {
    if (accountType) {
        return NextResponse.redirect(new URL(`/dashboard/${accountType}`, request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is trying to access a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/auth/login', request.url)
    
    // Include redirect param so user can go back to where they were going
    loginUrl.searchParams.set('redirect', pathname)
    
    return NextResponse.redirect(loginUrl)
  }

  // Dashboard root routing guard
  if (pathname === '/dashboard') {
      if (accountType) {
          return NextResponse.redirect(new URL(`/dashboard/${accountType}`, request.url))
      } else {
          return NextResponse.redirect(new URL('/', request.url))
      }
  }
  
  // Cross-account routing guard
  // If the user tries to access a path assigned to another account type, kick them to theirs
  if (token && accountType) {
      if (accountType === 'tutor' && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/tutor') && !pathname.startsWith('/dashboard/profile')) {
          return NextResponse.redirect(new URL(`/dashboard/tutor`, request.url))
      }
      if (accountType === 'parent' && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/parent') && !pathname.startsWith('/dashboard/profile')) {
          return NextResponse.redirect(new URL(`/dashboard/parent`, request.url))
      }
      if (accountType === 'student' && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/student') && !pathname.startsWith('/dashboard/profile')) {
          return NextResponse.redirect(new URL(`/dashboard/student`, request.url))
      }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/tutor-onboarding/:path*',
    '/dashboard/:path*',
    '/auth/:path*'
  ],
}
