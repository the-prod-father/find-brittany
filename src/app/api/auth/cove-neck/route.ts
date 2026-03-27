import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const VALID_USER = process.env.COVE_NECK_USER || "cnwatch";
const VALID_PASS = process.env.COVE_NECK_PASS || "marsh-heron-47";

// Session token derived from credentials so it rotates if creds change
const SESSION_TOKEN = crypto
  .createHash("sha256")
  .update(`${VALID_USER}:${VALID_PASS}:cove-neck-ops-2026`)
  .digest("hex")
  .slice(0, 32);

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
