import { NextResponse, type NextRequest } from "next/server"
import { parseSessionCookie } from "./lib/auth-client"
import {
  SESSION_COOKIE_NAME,
  shouldRedirectToMaintenance,
} from "./lib/auth-server"

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  console.log("[MIDDLEWARE] Processing request for path:", pathname)

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = sessionCookie ? parseSessionCookie(sessionCookie) : null
  console.log("[MIDDLEWARE] Session from cookie:", session)

  const isAdminRoute = pathname.startsWith("/admin")

  // Check maintenance mode
  const isMaintenance = await shouldRedirectToMaintenance(session)
  if (isMaintenance) {
    // Don't redirect if already on /maintenance
    if (pathname === "/maintenance") {
      return NextResponse.next()
    }
    // Allow access to admin routes even in maintenance
    if (isAdminRoute) {
      // For admin login page (/admin), allow access
      return NextResponse.next()
    }
    // Otherwise redirect to maintenance
    return NextResponse.redirect(new URL("/maintenance", request.url))
  }

  // If already on /maintenance and no maintenance, redirect to home
  if (pathname === "/maintenance") {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (session.role === "admin" || session.role === "superadmin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    } else if (session.role === "panitia") {
      return NextResponse.redirect(new URL("/rohis/home", request.url))
    } else {
      return NextResponse.redirect(new URL("/user/home", request.url))
    }
  }

  // IMPORTANT: Don't interfere with client-side routing!
  // The client-side pages already have proper session checks in their useEffect hooks
  // So we just let the request proceed, and let the client-side components handle the redirects
  console.log(
    "[MIDDLEWARE] Allowing request to proceed (client-side will handle session checks)"
  )
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/user/:path*",
    "/rohis/:path*",
    "/maintenance",
    "/",
  ],
}
