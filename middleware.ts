import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Handle trailing slash redirects
  if (pathname.endsWith('/') && pathname !== '/') {
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = pathname.slice(0, -1)
    return NextResponse.redirect(redirectUrl, 301)
  }
  
  // Handle root redirect for authenticated users
  if (pathname === '/') {
    const hasAuthToken = request.cookies.has('sb-access-token')
    if (hasAuthToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)',
  ],
}
