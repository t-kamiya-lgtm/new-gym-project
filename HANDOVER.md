# 引継ぎ書: ジムアフィリエイト管理システム(スマレジEC連携版)

## 0. このドキュメントについて

このドキュメントは、`new-gym-project` リポジトリでの作業を**別のClaude Codeセッションに引き継ぐ**ために作成した。新しいセッションは、このファイルと `docs/smaregi-api-reference.md`(スマレジEC API仕様の原文)を読めば、これまでの経緯・確定した設計判断・実装状況・残タスクをすべて把握できるようにしてある。

**最初にすべきこと**: 1章(現在の実装状況)を読み、リポジトリの現物(`src/`, `supabase/migrations/`)と照らし合わせること。2〜4章は背景・経緯の記録であり、実装済みかどうかの最終判断は必ず1章とリポジトリの現物を優先すること。

---

## 1. 現在の実装状況(`new-gym-project`)【最重要】

### 1.1 何を作っているか(一言で)

決済チャットボット(pm-chat-bot)+クーポンコードに依存していた現行の `gym-system` を、**スマレジEC(`primedirect.jp`)からAPIで受注を取得し、広告コードで店舗を識別し、会員の個人情報は持たない**新しいアーキテクチャに作り直している。報酬計算・月次締め・明細書発行のロジックは現行システムから移植する。

### 1.2 技術スタック

Next.js(App Router)+ Supabase(Postgres、pm-chat-botとは別の新規プロジェクト)+ Vercelホスティングを想定(現行gym-systemと同じ構成を踏襲)。`npm install` / `npx tsc --noEmit` / `npm run build` は現時点でエラーなく通ることを確認済み。

### 1.3 実装済みファイルと役割

| ファイル | 役割 | 状態 |
|---|---|---|
| `supabase/migrations/0001_init.sql` | 本体スキーマ: `corporations`(法人)、`stores`(店舗、`advertising_group_code`を1:1で保持)、`products`(商品コード→pt換算)、`order_lines`(受注明細台帳、PII非保持)、`order_sync_state`(ポーリングカーソル)、`monthly_statements`/`monthly_statement_stores`(月次締め) | 完了 |
| `supabase/migrations/0002_seed_dummy_and_products.sql` | ダミー法人1件+店舗2件(仮の広告コード)、商品4件(仮コード)を投入 | ダミーデータ。実法人・店舗が決まり次第差し替え |
| `supabase/migrations/0003_smaregi_oauth_tokens.sql` | OAuth2で取得したアクセストークンを保存する`smaregi_oauth_tokens`テーブル | 完了 |
| `supabase/migrations/0004_update_product_codes.sql` | 商品コードを実コード(`PM100`/`PM110`/`PM403`/`PM413`)に更新 | 完了。実データ反映済み |
| `src/lib/smaregi/types.ts` | スマレジ受注APIレスポンスの型定義(利用するフィールドのみ) | 完了 |
| `src/lib/smaregi/client.ts` | `orders/search` APIクライアント。`PII_EXCEPT_FIELDS`でPII項目を`except_fields`指定して取得時点から除外 | 完了 |
| `src/lib/smaregi/oauth.ts` | OAuth2認可コードフロー(認可URL生成、コード→トークン交換、DB保存・取得) | 完了 |
| `src/app/api/smaregi/oauth/start/route.ts` | 認可開始エンドポイント(スマレジの認可ページへリダイレクト、state発行) | 完了 |
| `src/app/api/smaregi/oauth/callback/route.ts` | 認可コールバック(state検証→トークン交換→DB保存) | 完了 |
| `src/lib/smaregi/sync.ts` | 受注同期ジョブ本体: `update_date`でポーリング→`advertising_group_code`で店舗マッピング→`product_code`でpt換算→`order_lines`にupsert | 完了だが**未検証**(実データでの動作確認がまだ) |
| `src/lib/statements.ts` | 月次締め・単価tier計算ロジック(現行gym-systemから移植) | 完了だが**未検証** |
| `src/lib/supabase.ts` | Supabaseサービスロールクライアント生成 | 完了 |
| `src/app/layout.tsx` / `page.tsx` | Next.jsの最小スケルトン。ダッシュボードUIは未実装 | 未着手 |
| `docs/smaregi-api-reference.md` | スマレジEC API仕様の原文保存(カートAPI/受注API/カートコンバージョンAPI/ログインAPI/OAuth2) | 参照資料 |

### 1.4 未実装・未検証のもの(次にやるべきこと)

優先度の高い順:

1. **実際のアクセストークン取得**: `docs/smaregi-api-reference.md`の5章 + 本書5.1の手順で、運営側管理者がスマレジ管理画面でアプリ登録・認可操作を行う必要がある(コードは実装済みだが未実施)。デプロイ先ドメインが未確定のため、そもそもまだ実施できない。
2. **デプロイ先の決定**: Vercelにデプロイし、実際のドメインを確定させる(OAuthのリダイレクトURLに必要)。
3. **`order_status`/`order_status2`のマスタ値確認**: `src/lib/smaregi/sync.ts`の`ORDER_STATUS_TO_SHIPMENT_FLAG`は仮のマッピング(`出荷済み`/`キャンセル`のみ、それ以外は`not_shipped`扱い)。サンドボックス環境が無いため、本番での少額テスト注文か、管理画面のステータス設定画面で実際の値を確認する必要がある。
4. **実データでの同期テスト**: 1・2・3が揃ってから、`syncOrders()`を実際に動かして`order_lines`に正しくデータが入るか確認する。
5. **ダッシュボードUI**: 法人・店舗別集計画面、「どのジム経由で・どの会員が・何を・いつ・何個」購入したかの一覧画面、月次締め画面、明細書PDF出力は未実装。現行gym-systemの`src/lib/pdf/StatementDocument.tsx`等を参考に作る想定。
6. **実際の法人・店舗・広告コードの投入**: `0002`のダミーデータを実データに差し替える(またはUIから登録できるようにする)。

---

## 2. ビジネス背景(要約)

### 2.1 現行システム(gym-system)の概要

- 運営会社: 株式会社プライムダイレクト(商品: プロテインモンスター)。代理店(ジム)経由のアフィリエイトプログラム。
- 流れ: 代理店(ジム)へ営業 → クーポンコード発行 → 10食セット・店舗POP発送 → ジムで会員へ販売 → 会員がQRから会員サイトへアクセスしクーポンコード入力で購入 → 月末締めで実績集計・明細書発行・パートナー同意 → 翌月末に報酬支払い。
- 報酬単価は店舗ごとの当月合計購入点数(pt)に応じて決まる(1〜9pt=300円、10〜99pt=450円、100pt以上=600円)。**この単価テーブルは新システムでも踏襲することが確定済み**。
- 技術構成: Next.js + Supabase + Vercel。決済チャットボット(pm-chat-bot)と同一Supabaseプロジェクトを共有し、`orders`テーブルへのPostgresトリガー+`pg_net`のWebhookで受注を取り込んでいた。店舗とクーポンコードは1対1(`gym_store_coupons`)。
- 受注明細台帳(`gym_order_lines`)→月末確定(`closeMonthForCorporation`、店舗ごとにpt集計→単価適用)→`gym_monthly_statements`にスナップショット保存→インボイス対応PDF明細書発行、という流れ。会員データは`customers`テーブル(氏名・生年月日等含む)をそのまま参照していた。
- 参考ファイル(現行`t-kamiya-lgtm/gym-system`リポジトリ内): `src/lib/statements.ts`、`src/lib/order-lines.ts`、`src/lib/points.ts`、`src/lib/pdf/StatementDocument.tsx`、`public/manual.html`/`manual-admin.html`。開発ブランチ運用は `claude/gym-affiliate-management-g9hchw`。DBマイグレーションは`supabase/migrations/`配下、CI自動適用なし・手動実行。

### 2.2 今回の方向転換(ユーザー原文)

> こちら、方向性転換の相談です。チャットボットを使用せず、スマレジECリピートにて管理することになります。また、クーポンコード運用ではなく、広告コードを使ったURL別実績集計になる。その前提で、スマレジECの該当の受注をAPIで拾って、法人、店舗別案で集計を行うシステム構築は可能か。会員情報は、どのジム経由で、どの会員が何を、いつ、何個が見られるようにして、個人情報は取り込まない。

要件整理: ①受注データソースをスマレジECリピートに変更、②実績紐付けをクーポンコードから広告コードへ変更、③法人・店舗別の集計、④「どのジム経由で・どの会員が・何を・いつ・何個」購入したかの可視化、⑤会員の個人情報を取り込まない。

---

## 3. 確定した設計判断(すべて)

| 論点 | 結論 |
|---|---|
| 受注データ取得方法 | スマレジEC(`primedirect.jp`)の`orders/search` APIをポーリングして取得(Webhookは未確認、無い前提で設計) |
| 店舗の識別方法 | `order.advertising_group_code`(広告コード)。**スマレジ管理画面で発番・個別登録**、店舗1:1。アフィリエイト用途への転用は問題なしとユーザーが確認済み |
| 会員導線 | **注文フォーム一体型LP**。広告コード付きLPでフォーム入力した時点で会員登録+注文が同時完了(現行のQR→ログイン→クーポン入力という多段導線は廃止) |
| 店舗紐付けの実装方法 | カートコンバージョンAPI(外部ASPタグ出力用)は使わず、`orders/search`が返す`advertising_group_code`を店舗マスタと直接突合するだけで完結 |
| 会員の非PII識別子 | `order.customer_id`(EC/カート側の会員ID)を採用。`smaregi_customer_id`はスマレジPOS(実店舗レジ)側のIDで、オンライン注文のみの今回はほぼ空になるため不採用 |
| 保持する会員関連属性 | 会員ID(`customer_id`)+購入商品+数量+日時+店舗、の範囲のみ。氏名・住所・電話・メール・生年月日等は`except_fields`でAPI取得時点から除外 |
| 対象商品・pt換算 | 4品番、すべて「10食セット=1pt」。①プロテインモンスター単品`PM100`、②プロテインモンスター定期`PM110`、③プロテインモンスターソバ単品`PM403`、④プロテインモンスターソバ定期`PM413`(価格は参考: 通常3,980円、会員特別2,980円、定期初回特別1,980円〜) |
| 報酬単価テーブル | 現行のまま踏襲(1〜9pt=300円、10〜99pt=450円、100pt以上=600円) |
| 認証方式 | OAuth2認可コードフロー(基本設定 > 外部アプリ連携)。実装済み、手順は5.1参照 |
| テスト/サンドボックス環境 | **無し**(本番環境のみ) |
| システム構成 | 新規リポジトリ(`new-gym-project`)+新規Supabaseプロジェクト(pm-chat-botとはDB共有しない)。現行gym-systemとは完全に独立 |
| API提供元についての重要な補足 | `primedirect.jp`はスマレジEC上に構築されたショップ。カートAPI/受注API/カートコンバージョンAPIは**スマレジ本体ではなく、スマレジから受注データの連携を受ける別サービス(中間システム)が提供**している。`smaregi_customer_id`等の「スマレジ側」フィールドが空になりやすいのはこのため |

現行資産のうち**流用可能**: 報酬単価tierロジック、月次締めフロー(未出荷チェック→確定→パートナー同意→再確定)、明細書PDF生成(インボイス対応)、権限モデル、マニュアル構成。**作り直しが必要**だったもの: 受注取込層(ポーリング方式で新規実装済み)、店舗紐付けキー(広告コードで実装済み)、会員データモデル(PII非保持で実装済み)、出荷/キャンセル状態管理(マスタ値確認待ち)。

---

## 4. 未解決の論点・要確認事項

- **`order_status`/`order_status2`/`payment_status`の実際のマスタ値一覧**とキャンセル・返品が伝票単位か明細単位かの実運用(最優先)
- **Webhook/プッシュ通知APIの有無**(無ければ現状のポーリング設計のまま進める)
- **既存gym-systemからの移行方針**(過去データの扱い、並行運用期間の有無、全社一斉切り替えか順次移行か)
- ダミーで登録している法人・店舗・広告コードを、いつ・どのように実データに置き換えるか(運営側での登録フローも含めて)

---

## 5. 実行手順

### 5.1 アクセストークン取得手順(コード実装済み・実施は未着手)

1. プライムダイレクト運営側の管理者が、スマレジEC管理画面「基本設定 > 外部アプリ連携」でアプリケーションを新規登録
   - リダイレクトURL: `https://<デプロイ先ドメイン>/api/smaregi/oauth/callback`
   - IP制限: 未設定推奨(Vercelは固定IPを持たないため)
   - → `client_id`/`client_secret`が発行される
2. 環境変数を設定: `SMAREGI_CLIENT_ID`、`SMAREGI_CLIENT_SECRET`、`SMAREGI_REDIRECT_URI`、`SMAREGI_OAUTH_BASE_URL`(`https://www.primedirect.jp`)
3. 管理者が `https://<デプロイ先ドメイン>/api/smaregi/oauth/start` にアクセスして許可する
4. 自動的に`/api/smaregi/oauth/callback`でトークンを取得し`smaregi_oauth_tokens`に保存(認可コードは1度しか使えないため)
5. 以降`syncOrders()`は保存済みトークンを自動使用

詳細な仕様は `docs/smaregi-api-reference.md` の5章を参照。

### 5.2 セットアップ

```bash
npm install
cp .env.example .env.local  # 値を埋める
```

Supabaseプロジェクトを新規作成し、`supabase/migrations/`配下のSQLを連番順に手動実行する(現行gym-systemと同様、CI自動適用はしない運用)。

```bash
npm run dev
```

---

## 6. スマレジEC API仕様(参照)

カートAPI・受注API(全453項目のフィールド一覧含む)・カートコンバージョンAPI・ログインAPI・OAuth2認証の**原文はすべて `docs/smaregi-api-reference.md` に保存済み**。新しいセッションはこのファイルを一次情報として参照すること(ユーザーに再度API仕様を尋ねる必要はない)。
