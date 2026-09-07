# new-gym-project

ジムアフィリエイト管理システムの新アーキテクチャ(スマレジECリピート連携版)。

背景・要件・調査結果・現行 `gym-system` からの流用方針は [`HANDOVER.md`](./HANDOVER.md) を参照してください。

## 現在の実装状況

- `supabase/migrations/0001_init.sql`: 法人・店舗(広告コード1:1)・商品・受注明細台帳・月次締めのスキーマ
- `src/lib/smaregi/client.ts`: スマレジEC `orders/search` APIクライアント(PII項目は`except_fields`で除外して取得)
- `src/lib/smaregi/sync.ts`: 受注同期ロジック(ポーリング、広告コード→店舗マッピング、ポイント換算、`order_lines`へのupsert)
- `src/lib/statements.ts`: 月次締め・単価tier計算ロジック(現行gym-systemから移植)
- `src/app/`: Next.js App Router の最小スケルトン(ダッシュボード・締め画面等は未実装)

未実装・要確認事項は `HANDOVER.md` の「5.3 実装着手にあたり確認が必要な項目チェックリスト」を参照してください。特に以下は現時点で**仮の実装**です。

- `src/lib/smaregi/sync.ts` の `ORDER_STATUS_TO_SHIPMENT_FLAG`: 実際の`order_status`マスタ値が未確認のため仮のマッピング
- `member_key` に `order.customer_id` を採用(仮): `smaregi_customer_id` との使い分けは未確定
- `products` テーブルの初期データ(商品コード・pt換算)は未投入

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
