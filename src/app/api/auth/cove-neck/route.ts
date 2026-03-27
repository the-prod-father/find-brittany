import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const VALID_USER = process.env.COVE_NECK_USER || "cnwatch";
const VALID_PASS = process.env.COVE_NECK_PASS || "marsh-heron-47";

// Must match middleware's simpleHash exactly
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36) + "cns";
}

const SESSION_TOKEN = simpleHash(`${VALID_USER}:${VALID_PASS}:cove-neck-ops-2026`);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === VALID_USER && password === VALID_PASS) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("cn-auth", SESSION_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("cn-auth");

    if (auth?.value === SESSION_TOKEN) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
