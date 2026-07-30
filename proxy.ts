import { NextResponse, type NextRequest } from "next/server"
import {
  parseSignedSessionCookie,
  SESSION_COOKIE_NAME,
  shouldRedirectToMaintenance,
} from "./lib/auth-server"

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  console.log("[PROXY] Processing request for path:", pathname)

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = sessionCookie
    ? parseSignedSessionCookie(sessionCookie)
    : null
  console.log("[PROXY] Session from cookie:", session)

  const isAdminRoute = pathname.startsWith("/admin")

  const isMaintenance = await shouldRedirectToMaintenance(session)
  if (isMaintenance) {
    if (pathname === "/maintenance") {
      return NextResponse.next()
    }

    if (isAdminRoute) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL("/maintenance", request.url))
  }

  if (pathname === "/maintenance") {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url))
    }

    if (session.role === "admin" || session.role === "superadmin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }

    if (session.role === "panitia") {
      return NextResponse.redirect(new URL("/rohis/home", request.url))
    }

    return NextResponse.redirect(new URL("/user/home", request.url))
  }

  console.log(
    "[PROXY] Allowing request to proceed (client-side will handle session checks)"
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
