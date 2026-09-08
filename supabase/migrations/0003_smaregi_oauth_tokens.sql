-- Stores the OAuth2 token obtained from Sumaregi EC's external-app integration
-- (基本設定 > 外部アプリ連携). The authorization-code exchange can only be done
-- once per code, so the resulting token must be persisted here rather than
-- re-derived -- see src/lib/smaregi/oauth.ts.
create table smaregi_oauth_tokens (
  id boolean primary key default true check (id),
  access_token text not null,
  refresh_token text,
  -- null when the token response's expires_in was null (no expiry given)
  expires_at timestamptz,
  obtained_at timestamptz not null default now()
);
