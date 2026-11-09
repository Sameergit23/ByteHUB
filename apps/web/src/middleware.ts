import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface TokenPayload {
  id: string;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN";
  exp?: number;
}

/**
 * Lightweight JWT payload decoder for Next.js Edge Middleware
 */
function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route paths
  const isStudentRoute = pathname.startsWith("/dashboard/student");
  const isCompanyRoute = pathname.startsWith("/dashboard/company");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isStudentRoute && !isCompanyRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // 1. Retrieve access token from cookies
  const token = request.cookies.get("bh_access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Decode user role
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.role) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check expiration if present
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("mode", "login");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = payload.role;

  // 3. Admin has root access to all portals
  if (role === "ADMIN") {
    return NextResponse.next();
  }

  // 4. Role-specific boundaries
  if (isAdminRoute && role !== "ADMIN") {
    // Non-admin attempting to access admin portal
    return NextResponse.redirect(
      new URL(role === "COMPANY" ? "/dashboard/company" : "/dashboard/student", request.url)
    );
  }

  if (isStudentRoute && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard/company", request.url));
  }

  if (isCompanyRoute && role !== "COMPANY") {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/student/:path*",
    "/dashboard/company/:path*",
    "/admin/:path*",
  ],
};
