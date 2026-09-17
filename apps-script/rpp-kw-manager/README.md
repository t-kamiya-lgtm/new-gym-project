# RPP KW Manager (Google Apps Script)

楽天RPPキーワード管理システムの実装。設計の背景・判定ロジックの根拠は
`docs/rakuten-rpp-management-design.md`(リポジトリルート)を参照。このREADMEは
「どう動かすか」だけを書く。

## 構成

```
src/
  Constants.js          シート名・商品コード対応表・列定義
  Config.js             Script Properties の読み書き
  CsvUtils.js           CSVパース・ヘッダー検出(GAS非依存、Nodeでテスト可能)
  PricingModel.js        増し分利益・目標CPA/ROAS計算(GAS非依存、Nodeでテスト可能)
  SheetUtils.js          シート読み書きの共通ヘルパー
  RppReportImporter.js   RPPレポートCSV取込(4-1章)
  OrganicRankChecker.js  自然検索順位チェック(4-2章、楽天市場商品検索API)
  OtherPromoImporter.js  楽天内の他施策レポート取込(12章、列マッピング未確定のため生データ取込)
  SetupSpreadsheet.js    シート初期セットアップ(設定シートの数式・KW管理表の判定式を設置)
  Triggers.js            月・木の週次トリガー
  Menu.js                スプレッドシートのカスタムメニュー
test/
  *.test.js              GAS非依存ロジックのNodeテスト(`npm test`)
```

## デプロイ手順(clasp)

1. `npm install -g @google/clasp` (未導入の場合)
2. `clasp login`
3. 新規のGoogle Apps Scriptプロジェクトを作成し、**このKW管理表のスプレッドシートに紐づくコンテナバインドスクリプト**として作る
   (スプレッドシートを開き、拡張機能 > Apps Script)
4. このディレクトリで `clasp clone <scriptId>` するか、`.clasp.json` を手動作成して `clasp push`
5. Apps Scriptエディタでスプレッドシートを開き直すと、`onOpen` によりメニュー「RPP管理」が表示される

`.clasp.json` はスクリプトIDがプロジェクトごとに異なるため、このリポジトリにはコミットしていない
(`.gitignore` 参照)。各自の環境で作成すること。

## 初期設定(Script Properties)

Apps Scriptエディタ > プロジェクトの設定 > スクリプト プロパティ で以下を設定する
(`src/Config.js` の `setScriptProperties_()` に値を埋めて一度実行してもよい):

| キー | 内容 |
|---|---|
| `RAKUTEN_APP_ID` | Rakuten Developersアプリのアプリケーション ID(2026年2月のAPI移行後はUUID形式) |
| `RAKUTEN_ACCESS_KEY` | 同アプリのアクセスキー(2026年2月の移行で追加された必須パラメータ。下記「現状の制約」参照) |
| `SPREADSHEET_ID` | このKW管理表スプレッドシートのID |
| `RPP_REPORT_FOLDER_ID` | RPPレポートCSVを投入するDriveフォルダ |
| `RPP_REPORT_PROCESSED_FOLDER_ID` | 取込済みRPPレポートの退避先フォルダ |
| `OTHER_PROMO_FOLDER_ID` | 楽天内の他施策レポート(クーポンアドバンス等)を投入するDriveフォルダ |
| `OTHER_PROMO_PROCESSED_FOLDER_ID` | 取込済み他施策レポートの退避先フォルダ |
| `SHOP_CODE` | 楽天店舗コード(省略時 `florahouse`) |

対象のDriveフォルダ4つ(RPPレポート受信/処理済み、他施策レポート受信/処理済み)は事前にDrive上で作成し、
それぞれのフォルダIDをURLから取得して設定する。

## 初回セットアップ手順

1. 上記Script Propertiesを設定する
2. スプレッドシートのメニュー「RPP管理」→「初期セットアップ(初回のみ)」を実行
   - `RPP_KW管理表` `設定` `取込ログ` `順位履歴ログ` `他施策ログ` `外部施策ログ(手入力)` `ダッシュボード` の
     7シートが作成され、`設定`シートの目標CPA/ROASテーブルと`RPP_KW管理表`の判定式が設置される
   - 既存のKW管理表がある場合は、列構成(`src/Constants.js` の `KW_MASTER_COLUMNS`)に合わせて
     手動で移行するか、既存シート名を変えてから実行する(このスクリプトは同名シートを上書きしない)
3. メニュー「RPP管理」→「週次トリガー設置(月・木 朝6時)」を実行
4. `RPP_KW管理表` に既存の運用中KW(商品/KW/競合/目安CPC/運用ステータス等)を手動で入力する
   (KWリストの自動生成はスコープ外。設計書7章参照)
5. RPPレポートCSVをRPP_REPORT_FOLDER_IDのフォルダに置き、メニュー「今すぐ更新」で動作確認する

## 現状の制約・要検証事項(設計書11章と対応)

- **広告表示順位はRPPレポートに含まれないため自動取得できない**。`RPP_KW管理表`の「広告表示順位」列と
  `順位履歴ログ`の該当列は手動入力のまま運用する(自然検索順位のみAPIで自動取得)
- 自然検索順位チェックでの商品突合は `itemUrl`(商品ページURLのスラッグ`/florahouse/pm/`等)で行う。
  当初`itemCode`(`florahouse:pm`形式)で突合する想定だったが、2026-09-17の実機テストで
  APIの`itemCode`は`florahouse:10000165`のような予測不可能な内部管理番号であることが判明し、
  全KWが圏外になる誤判定が起きたため`itemUrl`突合方式に変更済み(`Constants.js`の`PRODUCT_ITEM_URL_PATH`)
- **楽天ウェブサービスは2026年2月にAPI移行があり、エンドポイントと認証方式が変わっている**
  (旧`app.rakuten.co.jp/services/api/...` + `applicationId`のみ → 新`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701`
  + `applicationId`(UUID形式)と`accessKey`の両方が必須、`genreId`パラメータも必須)。対応済み
- **新規作成したRakuten Developersアプリは、APIアクセススコープに「楽天市場API」を明示的にチェックしないと
  `REQUESTED_SCOPES_NOT_ALLOWED`(HTTP 403)エラーになる**。フォーム送信時にエラーが出て再送信すると
  スコープ選択がリセットされることがあるため、アプリ作成後は「詳細」画面で
  スコープが実際に付与されているか必ず確認すること
- 他施策レポート(クーポンアドバンス等)は実サンプル未確認のため、`OtherPromoImporter.js` は
  列マッピングをせず生データ(JSON)をそのまま`他施策ログ`に積むだけの実装になっている。
  実サンプルが手に入ったら、`RppReportImporter.js`の`RPP_CSV_COLUMN_MAP`と同じ要領で
  専用の列マッピングを追加するとよい
- `設定`シートの「判定→次アクション」対応表や目標増し分利益率(初期値10%)は、業務側でいつでも
  シート上の値を書き換えて調整できる(スクリプトの再実行は不要)
- KWごとに「新規獲得/標準/大容量」のどのラインで判定するかは、`RPP_KW管理表`の「ライン」列に
  手動で入力する運用(未入力時は「新規獲得ライン」がデフォルト)。将来的にKW分類から自動判定する
  ロジックに拡張する余地がある(設計書11章の未解決事項)

## テスト

GAS依存のない純粋なロジック(CSVパース、増し分利益/目標CPA計算、列文字変換)はNodeで実行できる。

```sh
npm test
```

`test/fixtures/rpp_report_sample.csv` は実際のRMSエクスポート(2026-09-17取得分)の構造を保った
サンプル(実際の売上等の数値は使わず構造検証用に作成したもの)。
