import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/smaregi/oauth";

export const dynamic = "force-dynamic";

// Sumaregi redirects here with ?code=...&state=.... The code can only be
// exchanged for a token once, so we do that immediately and store the
// resulting access_token (see smaregi_oauth_tokens table) rather than
// returning it to the browser.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("smaregi_oauth_state")?.value;

  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "state mismatch" }, { status: 400 });
  }

  await exchangeCodeForToken(code);

  const res = NextResponse.json({ ok: true, message: "Sumaregi access token stored." });
  res.cookies.delete("smaregi_oauth_state");
  return res;
}
