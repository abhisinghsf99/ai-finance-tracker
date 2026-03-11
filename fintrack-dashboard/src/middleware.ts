import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const session = request.cookies.get("fintrack-session")
  const { pathname } = request.nextUrl

  // Allow login page and auth API route without session
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // If already authenticated and visiting /login, redirect to dashboard
    if (session?.value && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // No session cookie -> redirect to login
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
}
