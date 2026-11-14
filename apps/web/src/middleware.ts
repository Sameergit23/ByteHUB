import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface TokenPayload {
  id?: string;
  userId?: string;
  email?: string;
  role?: "STUDENT" | "COMPANY" | "ADMIN";
  exp?: number;
}

/**
 * Lightweight JWT payload decoder for Next.js Edge Middleware. It only reads the payload to
 * route people; the API checks the signature and permissions on every request.
 */
function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** The signed-in user's role from the access-token cookie, or null when signed out/expired. */
function sessionRole(request: NextRequest): TokenPayload["role"] | null {
  const token = request.cookies.get("bh_access_token")?.value;
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.role) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload.role;
}

/**
 * The admin panel's secret address, from the ADMIN_PATH setting (e.g. "ops-7k2m9x4q2v").
 * When it is set, the panel lives at /<ADMIN_PATH> and /admin shows "page not found".
 * Without it (local development) the panel stays at /admin.
 */
function adminBasePath(): string {
  const raw = (process.env.ADMIN_PATH || "").trim().replace(/^\/+|\/+$/g, "");
  if (!raw || raw === "admin" || !/^[A-Za-z0-9_-]{8,64}$/.test(raw)) return "/admin";
  return `/${raw}`;
}

const loginUrl = (request: NextRequest, returnTo?: string) => {
  const url = new URL("/auth", request.url);
  url.searchParams.set("mode", "login");
  if (returnTo) url.searchParams.set("redirect", returnTo);
  return url;
};

/** A real 404 page, so the hidden panel looks like any address that doesn't exist. */
const notFound = (request: NextRequest) =>
  NextResponse.rewrite(new URL("/__page-not-found", request.url));

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adminBase = adminBasePath();
  const hidden = adminBase !== "/admin";
  const role = sessionRole(request);

  // 1. The admin panel -------------------------------------------------------------------
  const isInternalAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (hidden && isInternalAdminPath) return notFound(request);

  const isAdminPath = pathname === adminBase || pathname.startsWith(`${adminBase}/`);
  if (isAdminPath) {
    // Signed out (or the 15-minute cookie lapsed): sign in, then come straight back.
    if (!role)
      return NextResponse.redirect(loginUrl(request, hidden ? undefined : pathname));
    // Students and others don't learn that this address exists.
    if (role !== "ADMIN")
      return hidden
        ? notFound(request)
        : NextResponse.redirect(new URL("/dashboard/student", request.url));

    // Tell the admin pages their public address (used for links); serve /admin/* internally.
    const headers = new Headers(request.headers);
    headers.set("x-admin-base", adminBase);
    if (!hidden) return NextResponse.next({ request: { headers } });
    const internal = new URL(
      `/admin${pathname.slice(adminBase.length)}${search}`,
      request.url
    );
    return NextResponse.rewrite(internal, { request: { headers } });
  }

  // 2. "/dashboard": everyone's home after signing in (staff go to the admin panel) ---------
  if (pathname === "/dashboard") {
    if (!role) return NextResponse.redirect(loginUrl(request));
    if (role === "ADMIN") return NextResponse.redirect(new URL(adminBase, request.url));
    return NextResponse.redirect(
      new URL(
        role === "COMPANY" ? "/dashboard/company" : "/dashboard/student",
        request.url
      )
    );
  }

  // 3. Student and company dashboards ---------------------------------------------------------
  const isStudentRoute = pathname.startsWith("/dashboard/student");
  const isCompanyRoute = pathname.startsWith("/dashboard/company");
  if (!isStudentRoute && !isCompanyRoute) return NextResponse.next();

  if (!role) return NextResponse.redirect(loginUrl(request, pathname));
  if (role === "ADMIN") return NextResponse.next(); // staff can open any dashboard
  if (isStudentRoute && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard/company", request.url));
  }
  if (isCompanyRoute && role !== "COMPANY") {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every page (the admin address comes from a setting, so it can't be listed here); not the
  // API proxy, Next's own files or files with an extension.
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
