import { createServiceClient } from "../supabase";

// OAuth2 authorization-code flow for Sumaregi EC's external-app integration
// (基本設定 > 外部アプリ連携). Base URL is the same primedirect.jp domain the
// orders/cart APIs live on, since that store is itself built on Sumaregi EC.
function baseUrl(): string {
  const url = process.env.SMAREGI_OAUTH_BASE_URL;
  if (!url) throw new Error("SMAREGI_OAUTH_BASE_URL is not set");
  return url;
}

function clientId(): string {
  const id = process.env.SMAREGI_CLIENT_ID;
  if (!id) throw new Error("SMAREGI_CLIENT_ID is not set");
  return id;
}

function clientSecret(): string {
  const secret = process.env.SMAREGI_CLIENT_SECRET;
  if (!secret) throw new Error("SMAREGI_CLIENT_SECRET is not set");
  return secret;
}

function redirectUri(): string {
  const uri = process.env.SMAREGI_REDIRECT_URI;
  if (!uri) throw new Error("SMAREGI_REDIRECT_URI is not set");
  return uri;
}

// We only ever read order/customer data, never write it back.
const SCOPE = "read_sales";

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
    scope: SCOPE,
  });
  return `${baseUrl()}/api/oauth/authorize.php?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number | null;
  refresh_token: string | null;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  // The vendor's docs specify grant_type=client_credentials even though this is
  // an authorization-code exchange (their API, their naming) -- followed literally.
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    code,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${baseUrl()}/api/oauth/token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Sumaregi token exchange failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as TokenResponse;

  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("smaregi_oauth_tokens").upsert({
    id: true,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: expiresAt,
    obtained_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getStoredAccessToken(): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("smaregi_oauth_tokens").select("access_token").eq("id", true).single();
  if (error || !data) {
    throw new Error("No Sumaregi access token stored yet -- complete the /api/smaregi/oauth/start flow first");
  }
  return data.access_token;
}
