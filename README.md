# new-gym-project

ジムアフィリエイト管理システムの新アーキテクチャ(スマレジECリピート連携版)。

**別のセッションに引き継ぐ場合は、まず [`HANDOVER.md`](./HANDOVER.md) を読んでください。** 背景・要件・確定した設計判断・実装状況・残タスクをすべてまとめています。スマレジEC APIの仕様原文(カートAPI/受注API/カートコンバージョンAPI/ログインAPI/OAuth2)は [`docs/smaregi-api-reference.md`](./docs/smaregi-api-reference.md) にあります。

## 現在の実装状況

- `supabase/migrations/0001_init.sql`: 法人・店舗(広告コード1:1)・商品・受注明細台帳・月次締めのスキーマ
- `supabase/migrations/0002_seed_dummy_and_products.sql` + `0004_update_product_codes.sql`: ダミー法人・店舗、商品4品番(実コード `PM100`/`PM110`/`PM403`/`PM413`)
- `src/lib/smaregi/client.ts`: スマレジEC `orders/search` APIクライアント(PII項目は`except_fields`で除外して取得)
- `src/lib/smaregi/oauth.ts` + `src/app/api/smaregi/oauth/{start,callback}/route.ts`: 外部アプリ連携のOAuth2認可コードフロー(手順はHANDOVER.md 5.1参照)。取得したアクセストークンは`smaregi_oauth_tokens`テーブルに保存し、`syncOrders()`が自動で使用する
- `src/lib/smaregi/sync.ts`: 受注同期ロジック(ポーリング、広告コード→店舗マッピング、ポイント換算、`order_lines`へのupsert)。**未検証**
- `src/lib/statements.ts`: 月次締め・単価tier計算ロジック(現行gym-systemから移植)。**未検証**
- `src/app/`: Next.js App Router の最小スケルトン(ダッシュボード・締め画面等は未実装)

未実装・要確認事項は `HANDOVER.md` の「1.4 未実装・未検証のもの」「4. 未解決の論点」を参照してください。特に `src/lib/smaregi/sync.ts` の `ORDER_STATUS_TO_SHIPMENT_FLAG` は実際の`order_status`マスタ値が未確認のため仮のマッピングです。

## セットアップ

```bash
npm install
cp .env.example .env.local  # 値を埋める
```

Supabaseプロジェクトを作成し、`supabase/migrations/`配下のSQLを順番に適用してください(現行gym-systemと同様、CIでの自動適用は行わずSupabase側で手動実行する運用を想定)。

```bash
npm run dev
```

## 受注同期の実行

`src/lib/smaregi/sync.ts` の `syncOrders()` を、Vercel Cron などから定期実行する想定です(Webhookの有無が未確認のため、初期はポーリング前提)。呼び出し用のAPI Route/Cron設定はまだ未実装です。
