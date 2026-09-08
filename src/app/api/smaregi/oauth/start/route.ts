import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/smaregi/oauth";

// Depends on env vars read at request time; must not be statically prerendered.
export const dynamic = "force-dynamic";

// Visit this route (as the Sumaregi EC admin, logged in) to begin the
// one-time authorization. It redirects to Sumaregi's consent page; after
// approving, Sumaregi redirects back to /api/smaregi/oauth/callback.
export async function GET() {
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set("smaregi_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
