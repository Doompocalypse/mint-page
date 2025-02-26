import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add CORS headers
  const response = NextResponse.next()
  
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  return response
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to specific pages
    '/presale',
    '/affiliate'
  ],
}