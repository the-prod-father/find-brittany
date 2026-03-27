import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const VALID_USER = process.env.COVE_NECK_USER || "cnwatch";
const VALID_PASS = process.env.COVE_NECK_PASS || "marsh-heron-47";

const SESSION_TOKEN = crypto
  .createHash("sha256")
  .update(`${VALID_USER}:${VALID_PASS}:cove-neck-ops-2026`)
  .digest("hex")
  .slice(0, 32);

// All protected route prefixes
const PROTECTED_PATHS = [
  "/cmd-center-7347",
  "/cove-neck-ops-7347",
  "/review/bk-ops-7347",
  "/case-files-7347",
  "/intel-ops-7347",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) return NextResponse.next();

  const authCookie = request.cookies.get("cn-auth");

  if (authCookie?.value === SESSION_TOKEN) {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL("/cove-neck", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/cmd-center-7347/:path*",
    "/cove-neck-ops-7347/:path*",
    "/review/bk-ops-7347/:path*",
    "/case-files-7347/:path*",
    "/intel-ops-7347/:path*",
  ],
};
