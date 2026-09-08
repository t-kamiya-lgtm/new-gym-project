# スマレジEC・リピート API仕様(原文保存)

このファイルは、株式会社プライムダイレクトの「スマレジEC・リピート/一元管理」(`https://www.primedirect.jp`)が提供するAPI仕様を、ヒアリングでユーザーから共有された原文のまま保存したものです。設計判断や実装状況は `HANDOVER.md` を参照してください。ここは一次情報のリファレンスです。

**重要な前提(HANDOVER.md 5.3.2より)**: `primedirect.jp` はスマレジEC上に構築されたショップであり、以下のカートAPI/受注API/カートコンバージョンAPIは、スマレジ本体ではなく、スマレジから受注データの連携を受ける中間サービス(通販ゲート的なもの)が提供している。スマレジPOS(実店舗レジ)とは別物。

---

## 1. カートAPI

### API情報

| 項目 | 内容 |
|---|---|
| API名 | カートAPI |
| 概要 | カート処理に関連するインターフェースを提供します。 |
| エンドポイント | `https://www.primedirect.jp/api/v2/cart` |

### 1.1 `[POST/GET] /api/v2/cart/confirm`

概要: カート処理に関連するオブジェクトを取得するインターフェースを提供します。

**request項目**

| キー | 値 | 説明 |
|---|---|---|
| customer_id | 顧客ID | ログインAPIで取得した顧客IDを指定。ログインしていない場合は0 |
| admin_id | 管理者ID | ログインAPIで取得した管理者IDを指定。ログインしていない場合は0 |
| deliv_id | 配送方法ID | 必須 |
| payment_id | 支払方法ID | 任意 |
| get_card | カート情報を含める | 任意、on:含める(payment_idの指定がGMOのみ有効) |
| shipping_zip | 送付先郵便番号 | 必須、ハイフン不要 |
| shipping_pref | 送付先都道府県ID | 必須 |
| shipping_addr01 | 送付先住所1 | 必須 |
| shipping_addr02 | 送付先住所2 | 任意 |
| shipping_company_name | 送付先会社名 | 任意 |
| shipping_company_department | 送付先部署名 | 任意 |
| shipping_name01 | 送付先姓 | 必須 |
| shipping_name02 | 送付先名 | 必須 |
| shipping_kana01 | 送付先姓カナ | 必須 |
| shipping_kana02 | 送付先名カナ | 必須 |
| shipping_tel | 送付先TEL | 必須、ハイフン区切り |
| shipping_fax | 送付先FAX | 必須、ハイフン区切り |
| shipping_trade_code | 送付先コード | 任意 |
| use_point | ポイント利用 | 1:利用する、2:利用しない |
| use_coupon_code | クーポンコード | 任意 |
| itemnumber | 商品数 | 必須 |
| product_class_id{n} | 商品規格ID | 必須(繰り返し項目) |
| quantity{n} | 商品数 | 必須(繰り返し項目) |

**response項目(抜粋、配列構造)**: `shipping_addr_list`、`pref`、`deliv_date_list`、`deliv_time_list`、`deliv_methods`、`payment_methods`、`teiki_cycle_sets`、`coupon_list`、`present_list`、`customer`(氏名・住所・TEL・EMAIL・ポイント等を含む)、`cart_items`(商品規格ID・商品名・価格・税率等)、`cart_total`(商品代金合計・割引・送料・消費税・請求額等)

サンプルコード(PHP)は原文の通り、`Authorization: Bearer {access_token}` ヘッダとCookieでセッションを引き継ぐ形式。

### 1.2 `[POST/GET] /api/v2/cart/checkout`

概要: カートの内容で受注を確定するインターフェース。request項目は`confirm`とほぼ同じ(customer_id, admin_id, deliv_id, payment_id, shipping_*, use_point, use_coupon_code, itemnumber, product_class_id{n}, quantity{n})。

**response項目**

| キー | 値 |
|---|---|
| order_id | 受注ID |

---

## 2. カートコンバージョンAPI

### API情報

| 項目 | 内容 |
|---|---|
| API名 | カートコンバージョンAPI |
| 概要 | コンバージョン後に呼び出すAPIを提供します。 |
| エンドポイント | `https://www.primedirect.jp/api/v2/cart` |

### `[POST/GET] /api/v2/cart/conversion`

概要: コンバージョン時のタグを取得するインターフェース。

**request項目**

| キー | 値 | 説明 |
|---|---|---|
| customer_id | 顧客ID | 必須。ログインAPIで取得した顧客ID |
| order_id | 受注ID | 必須 |
| referrer_url | リファラーURL | 任意。アフィリエイト管理のリファラーURLと部分一致で出力対象を絞る |

**response項目**

| キー | 値 | 説明 |
|---|---|---|
| header | HEADタグ | ブラウザ上に出力する |
| body | BODYタグ | ブラウザ上に出力する |
| socket | ソケット通信URL | 連携先のログ |

> **設計メモ(HANDOVER.md 4.2で確定済み)**: 本システムでは、このAPIを経由せず `orders/search` が返す `advertising_group_code` を直接使って店舗紐付けを行う方針とした。このAPIは外部ASP向けのコンバージョンタグ出力が主目的と考えられ、今回の用途では不要と判断している。

---

## 3. 受注API

### API情報

| 項目 | 内容 |
|---|---|
| API名 | 受注API |
| 概要 | 受注データを取得・作成・更新・削除するインターフェースを提供します。 |
| エンドポイント | `https://www.primedirect.jp/api/v2/orders` |

### 3.1 `[POST/GET] /api/v2/orders/search`

概要: 受注データを取得します。

**search_options**

| キー | 値 | 説明 |
|---|---|---|
| order_id_from / order_id_to | 受注ID範囲 | |
| ec_order_id | EC受注番号 | |
| customer_id | 顧客ID | |
| email | メールアドレス | |
| line_user_id | LINE-USER-ID | ※スマレジEC・一元管理は未対応 |
| member_code | 加盟店コード | ※スマレジEC・B2Bの場合 |
| order_date_from / order_date_to | 受注日範囲 | `YYYY-MM-DD HH`(時まで指定可) |
| shipping_date_from / shipping_date_to | お届け日範囲 | `YYYY-MM-DD` |
| hasso_date_from / hasso_date_to | 出荷予定日範囲 | `YYYY-MM-DD` |
| commit_date_from / commit_date_to | 出荷日範囲 | `YYYY-MM-DD` |
| cancel_date_from / cancel_date_to | キャンセル日範囲 | `YYYY-MM-DD` |
| update_date_from / update_date_to | 更新日範囲 | `YYYY-MM-DD HH:MM:SS` |
| order_statuses | 受注ステータス | ステータス名、カンマ区切りで複数指定可 |
| group_type | 同梱状況 | 0:未同梱、1:同梱済(親)、2:同梱済(子)、カンマ区切り可 |
| api_order_option1 | 封入物 | 1:すべての封入物区分を出力する |
| limit | 取得件数上限 | 未設定の場合は500 |
| offset | 取得開始位置 | |
| search_fields | 取得する項目名を指定 | |
| except_fields | 除外する項目名を指定 | |

`except_fields`を指定しない場合、自動で除外される項目: `order.first_buy_day`(初回購入日), `order.first_commit_day`(初回出荷日), および`periodical_order.*`の定期関連項目一式(`periodical_order_id`, `teiki_cycle_set`, `period_type`, `period_day`, `period_date`, `period_month_key`, `period_week`, `period_day_w`, `next_period`, `period_delivery_time`, `period_delivery_time_name`)。

**response_options**

| キー | 値 | 説明 |
|---|---|---|
| response_type | json, csv | |
| charset | utf-8, shift-jis | csvの場合のみ指定可。jsonはutf-8固定 |
| key_holding | 1 | order.order_idをインデックスとしてデータを返却 |

レスポンス例:
```json
{
  "success": "ok",
  "error_cd": "N-0001",
  "error_message": "",
  "response": { "orders": [ /* ... */ ] }
}
```

### 3.2 `[POST] /api/v2/orders/create`

概要: 受注データを作成・更新します。更新キー: `order.order_id`。パラメータ: `order` / `shipping` / `order_detail` / `order_group` / `periodical_order`。contentは`search`の返却値(orders)と同じ構造で指定。

### 3.3 `[POST] /api/v2/orders/update`

概要: 受注データを更新します。更新キー: `order.order_id`。パラメータ: `order` / `shipping` / `order_group` / `periodical_order`。

### 3.4 `[POST] /api/v2/orders/remove`

概要: 受注データを削除します。更新キー: `order.order_id`。パラメータ: `order`。

### 3.5 受注API項目情報(API項目名 ⇔ CSV項目名 対比表)

> 本システムが実際に利用する主なフィールド: `order.order_id`, `order.customer_id`, `order.advertising_group_code`(直接ADコード), `order.first_advertising_group_code`(初回ADコード), `order.referrer_url`, `order.referrer_url_param`, `order.order_date`, `order.order_status`, `order.order_status2`, `order.cancel_date`, `order.smaregi_customer_id`, `order_detail.product_code`, `order_detail.product_name`, `order_detail.product_quantity`, `order_detail.product_no`。氏名・住所・電話・メール等のPII項目は`except_fields`で除外して取得する(`src/lib/smaregi/client.ts`の`PII_EXCEPT_FIELDS`参照)。
>
> 以下はドキュメントに記載された全項目(453項目)の一覧。将来の機能拡張(定期購入対応、決済情報連携など)で参照する。

| NO | API項目名 | CSV項目名 | 型 | サイズ | 必須 | 説明 |
|---|---|---|---|---|---|---|
| 1 | order.order_id | 受注ID | 半角数字 | 11 | ◎ | 受注ID、または、EC注文番号、EC注文番号枝番、EC種類、EC店舗IDで特定された受注データに更新される |
| 2 | order.customer_id | 顧客ID | 半角数字 | 9 | 〇 | -1:名寄せ処理で顧客新規作成。非会員の場合は0 |
| 3 | order.message | 要望等 | 半角/全角 | 65000 | | |
| 4 | order.order_name01 | 注文者お名前(姓) | 半角/全角 | 50 | 〇 | |
| 5 | order.order_name02 | 注文者お名前(名) | 半角/全角 | 50 | | |
| 6 | order.order_kana01 | 注文者お名前(フリガナ・姓) | 半角/全角 | 50 | | |
| 7 | order.order_kana02 | 注文者お名前(フリガナ名) | 半角/全角 | 50 | | |
| 8 | order.order_company_name | 注文者会社名 | 半角/全角 | 50 | | |
| 9 | order.order_email | 注文者メールアドレス | EMAIL | 50 | 〇 | |
| 10 | order.order_company_department | 注文者部署名 | 半角/全角 | 50 | | |
| 11 | order.order_email_type | 注文者メールアドレスタイプ | 半角/全角 | 1 | 〇 | 1:PC 2:スマートフォン 3:携帯 |
| 12 | order.order_tel | 注文者電話番号 | 半角数字、ハイフン | 15 | 〇 | |
| 13 | order.order_fax | 注文者FAX | 半角数字、ハイフン | 15 | | |
| 14 | order.order_country_id | 注文者国 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 15 | order.order_zip | 注文者郵便番号 | 半角数字、ハイフン | 9 | 〇 | |
| 16 | order.order_pref | 注文者都道府県 | マスタ変換 | 50 | 〇 | マスタの名称と一致すること |
| 17 | order.order_addr01 | 注文者住所1 | 半角/全角 | 200 | 〇 | |
| 18 | order.order_addr02 | 注文者住所2 | 半角/全角 | 200 | | |
| 19 | order.order_sex | 注文者性別ID | 半角数字 | 1 | | |
| 20 | order.order_sex_name | 注文者性別 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 21 | order.order_birth | 注文者生年月日 | 日付 | 10 | | |
| 22 | order.order_job | 注文者職種ID | 半角数字 | 3 | | |
| 23 | order.order_job_name | 注文者職種 | マスタ変換 | 50 | | ※未使用 |
| 24 | order.subtotal | 商品合計 | 半角数字 | 9 | 〇 | |
| 25 | order.discount | 調整額 | 半角数字 | 9 | | |
| 26 | order.discount_memo | 調整額備考 | 半角/全角 | 200 | | |
| 27 | order.order_customer_rank_discount | うち割引額1 | 半角数字 | 9 | | |
| 28 | order.order_customer_repeat_discount | うち割引額2 | 半角数字 | 9 | | |
| 29 | order.order_customer_matome_discount | うち割引額3 | 半角数字 | 9 | | |
| 30 | order.total | 合計額 | 半角数字 | 9 | 〇 | |
| 31 | order.deliv_fee | 送料 | 半角数字 | 9 | 〇 | |
| 32 | order.charge | 手数料 | 半角数字 | 9 | 〇 | |
| 33 | order.coupon_code | クーポンコード | マスタ変換 | 50 | | マスタの名称と一致すること |
| 34 | order.coupon_name | クーポン名 | 半角/全角 | 200 | | |
| 35 | order.coupon_total | クーポン利用 | 半角数字 | 9 | | |
| 36 | order.use_point | ポイント利用 | 半角数字 | 9 | | |
| 37 | order.payment_total | 請求額 | 半角数字 | 9 | 〇 | |
| 38 | order.tax | 消費税額 | 半角数字 | 9 | 〇 | |
| 39 | order.add_point | 加算ポイント | 半角数字 | 9 | | |
| 40 | order.payment_amount_total | 入金額 | 半角数字 | 9 | 〇 | |
| 41 | order.deliv_fee_cost | 配送コスト | 半角数字 | 9 | | |
| 42 | order.ec_type | EC種類 | 半角/全角 | 3 | ◎ | (※1に同じ) |
| 43 | order.order_ec_type_name | EC種類名 | 半角/全角 | 50 | | |
| 44 | order.ec_order_id | EC注文番号 | 半角/全角 | 100 | ◎ | (※1に同じ) |
| 45 | order.ec_order_id_branch | EC注文番号枝番 | 半角数字 | 9 | ◎ | (※1に同じ)指定しない場合は0 |
| 46 | order.ec_shop_id | EC店舗ID | 半角数字 | 4 | ◎ | (※1に同じ)指定しない場合は1000 |
| 47 | order.order_shop_name | EC店舗名 | 半角/全角 | 50 | | |
| 48 | order.order_root | 販売ルートID | 半角数字 | 3 | 〇 | |
| 49 | order.order_root_name | 販売ルート | マスタ変換 | 50 | | マスタの名称と一致すること |
| 50 | order.order_cnt | 購入回数 | 半角数字 | 9 | | |
| 51 | order.order_status | 受注ステータス | 半角/全角 | 9 | 〇 | |
| 52 | order.order_status_name | 受注ステータス名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 53 | order.order_cancel_reason | キャンセル理由 | 半角/全角 | 3 | | |
| 54 | order.order_cancel_reason_name | キャンセル理由名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 55 | order.order_status2 | 受注分類 | 半角/全角 | 9 | | |
| 56 | order.order_status2_name | 受注分類名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 57 | order.payment_id | 支払方法ID | 半角/全角 | 9 | 〇 | |
| 58 | order.payment_method | 支払方法 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 59 | order.payment_status | 決済ステータス | 半角数字 | 3 | 〇 | |
| 60 | order.hasso_deliv_id | 配送業者ID | 半角/全角 | 9 | | |
| 61 | order.deliv_trans_name | 配送業者名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 62 | order.deliv_id | 配送方法ID | 半角/全角 | 9 | 〇 | |
| 63 | order.deliv_method | 配送方法名 | マスタ変換 | 9 | | マスタの名称と一致すること |
| 64 | order.hasso_deliv_kbn | 配送区分 | 半角/全角 | 3 | 〇 | |
| 65 | order.deliv_kbn_method | 配送区分名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 66 | order.reserve_type | 申込番号種類 | 半角/全角 | 9 | 〇 | |
| 67 | order.reserve_type_name | 申込番号種類名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 68 | order.reserve_order_id | 申込番号 | 半角/全角 | 100 | | |
| 69 | order.reserve_status | 申込状況 | 半角数字 | 1 | | 1:継続、2:休止、3:解約 |
| 70 | order.ec_update_status | 作業状況 | 半角/全角 | 50 | | 取込済、処理中、確定、「処理済」反映待ち、処理済 |
| 71 | order.order_date | 注文日時 | 時刻 | 19 | 〇 | |
| 72 | order.payment_limit_date | 支払期日 | 日付 | 10 | | |
| 73 | order.payment_date | 入金日 | 日付 | 10 | | |
| 74 | order.hasso_date | 出荷予定日 | 日付 | 10 | | |
| 75 | order.commit_date | 出荷日 | 日付 | 10 | | |
| 76 | order.sales_date | 売上日 | 日付 | 10 | | |
| 77 | order.note | ひとことメモ | 半角/全角 | 3000 | | |
| 78 | order.note_attention | 伝達事項 | 半角/全角 | 100 | | |
| 79 | order.note_history | 対応履歴 | 半角/全角 | 65000 | | |
| 80 | order.device_name | デバイス | マスタ変換 | 50 | | マスタの名称と一致すること |
| 81 | order.split_ec_order_id | 分割注文EC注文番号 | 半角/全角 | 9 | | |
| 82 | order.split_payment_flg | 分割注文請求先フラグ | 半角数字 | 1 | | 0:請求無し 1:請求あり |
| 83 | order.cancel_date | キャンセル日 | 日付 | 10 | | |
| 84 | order.cancel_memo | キャンセルメモ | 半角/全角 | 3000 | | |
| 85 | order.advertising_group_code | 直接ADコード | 半角/全角 | 50 | | **広告コード(店舗紐付けの根拠)** |
| 86 | order.first_advertising_group_code | 初回ADコード | 半角/全角 | 50 | | 初回注文時の広告コード |
| 87 | order.asuraku_flag | あすつくフラグ | 半角数字 | 1 | | 0:指定なし、1:きょうつく、2:あすつく、3:翌々日 |
| 88 | order.tax_calc_type | 消費税計算区分 | 半角/全角 | 10 | | 伝票単位、伝票単位(B)、明細単位 |
| 89 | order.total_notax | 合計額(税別) | 半角数字 | 9 | 〇 | |
| 90 | order.total_tax | 合計額消費税 | 半角数字 | 9 | 〇 | 合計額の消費税 |
| 91 | order.deliv_fee_notax | 送料(税別) | 半角数字 | 9 | 〇 | |
| 92 | order.charge_notax | 手数料(税別) | 半角数字 | 9 | 〇 | |
| 93 | order.recalc_flg | 再計算フラグ | 半角/全角 | 1 | | 0:再計算しない、1:再計算する |
| 94 | order.order_customer_rank | 顧客ランク | マスタ変換 | 3 | | ※B2Bの場合は加盟店ランク |
| 95 | order.order_customer_rank_point_rate_power | 顧客ランクポイント倍率 | 半角/全角 | 3 | | |
| 96 | order.other_discount | うちその他調整額 | 半角/全角 | 9 | | |
| 97 | order.customer_note | 顧客備考 | 半角/全角 | 3000 | | 更新不可 |
| 98 | order.total_quantity | 商品点数 | 半角/全角 | 9 | | 更新不可 |
| 99 | shipping.shipping_trade_code | 送付先コード | 半角/全角 | 50 | | |
| 100 | shipping.shipping_name01 | 送付先お名前(姓) | 半角/全角 | 50 | 〇 | |
| 101 | shipping.shipping_name02 | 送付先お名前(名) | 半角/全角 | 50 | | |
| 102 | shipping.shipping_kana01 | 送付先お名前(フリガナ・姓) | 半角/全角 | 50 | | |
| 103 | shipping.shipping_kana02 | 送付先お名前(フリガナ名) | 半角/全角 | 50 | | |
| 104 | shipping.shipping_company_name | 送付先会社名 | 半角/全角 | 50 | | |
| 105 | shipping.shipping_company_department | 送付先部署名 | 半角/全角 | 50 | | |
| 106 | shipping.shipping_tel | 送付先電話番号 | 半角数字、ハイフン | 50 | 〇 | |
| 107 | shipping.shipping_fax | 送付先FAX | 半角数字、ハイフン | 50 | | |
| 108 | shipping.shipping_country_id | 送付先国 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 109 | shipping.shipping_zip | 送付先郵便番号 | 半角数字、ハイフン | 8 | 〇 | |
| 110 | shipping.shipping_pref | 送付先都道府県 | マスタ変換 | 50 | 〇 | マスタの名称と一致すること |
| 111 | shipping.shipping_addr01 | 送付先住所1 | 半角/全角 | 200 | 〇 | |
| 112 | shipping.shipping_addr02 | 送付先住所2 | 半角/全角 | 200 | | |
| 113 | shipping.hasso_denpyo_code | 送り状伝票番号 | 半角/全角 | 30 | | |
| 114 | shipping.hasso_eigyo_flg | 営業所止め | 半角数字 | 1 | | 1:営業所止め |
| 115 | shipping.hasso_chaku_flg | 着払いフラグ | 半角数字 | 1 | | 1:着払い |
| 116 | shipping.hasso_eigyo_code | 営業所コード | 半角/全角 | 50 | | |
| 117 | shipping.hasso_memo | 送り状記事 | 半角/全角 | 50 | | |
| 118 | shipping.hasso_koguchi | 個口 | 半角数字 | 9 | | |
| 119 | shipping.shipping_keisho_name | 敬称 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 120 | shipping.shipping_date | お届け日 | 日付 | 10 | | |
| 121 | shipping.shipping_time | お届け時間 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 122 | shipping.extra_delivfee_kbn | 送料計算区分 | 半角/全角 | 10 | | |
| 123 | shipping.shipping_email | 送付先メールアドレス | EMAIL | 50 | | |
| 124 | shipping.one_day_operation_flg | 注文当日出荷フラグ | 半角数字 | 1 | | |
| 125 | shipping.social_gift_flag | ソーシャルギフト注文フラグ | 半角数字 | 1 | | 更新不可。0:ソーシャルギフトではない 1:ソーシャルギフト注文 |
| 126 | order.gift_flag | ギフトフラグ | 半角数字 | 1 | | 1:ギフト指定 |
| 127 | order.noshi_text | のし区分 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 128 | order.noshi_name | のし名入 | 半角/全角 | 50 | | |
| 129 | order.mark1 | マーク1 | 半角数字 | 1 | | 0:なし 1:あり |
| 130 | order.mark2 | マーク2 | 半角数字 | 1 | | 0:なし 1:あり |
| 131 | order.mark3 | マーク3 | 半角数字 | 1 | | 0:なし 1:あり |
| 132 | order.print_type1 | 出力フラグ(受注伝票) | 半角数字 | 1 | | 0:出力なし 1:出力あり |
| 133 | order.print_type5 | 出力フラグ(お手紙) | 半角数字 | 1 | | 0:出力なし 1:出力あり |
| 134 | order.print_type2 | 出力フラグ(納品書) | 半角数字 | 1 | | 0:出力なし 1:出力あり 2:出力あり(金額なし) |
| 135 | order.print_type3 | 出力フラグ(領収書) | 半角数字 | 1 | | 0:出力なし 1:出力あり 2:出力あり(納品書兼) |
| 136 | order.print_type3_name | 領収書宛名 | 半角/全角 | 50 | | |
| 137 | order.print_type3_biko | 領収書但し書き | 半角/全角 | 50 | | |
| 138 | order.print_type4 | 出力フラグ(請求書) | 半角数字 | 1 | | 0:出力なし 1:出力あり |
| 139 | order.print_type4_biko | 請求書備考 | 半角/全角 | 50 | | |
| 140 | order.print_type13 | 出力フラグ(EMS) | 半角数字 | 1 | | 0:出力なし 1:出力あり |
| 141 | order.print_type6 | 出力フラグ(送り状) | 半角数字 | 1 | | 0:出力なし 1:依頼主に店舗名を出力 2:依頼主に注文者を出力 |
| 142 | order.print_date1 | 出力済(受注伝票) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 143 | order.print_date5 | 出力済(お手紙) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 144 | order.print_date2 | 出力済(納品書) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 145 | order.print_date3 | 出力済(領収書) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 146 | order.print_date4 | 出力済(請求書) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 147 | order.print_date13 | 出力済(EMS) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 148 | order.print_date6 | 出力済(送り状) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 149 | order.print_date7 | 出力済(後払い取引登録) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 150 | order.print_date8 | 出力済(後払い出荷登録) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 151 | order.print_date9 | 出力済(配送指示伝票) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 152 | order.print_date10 | 出力済(モール連携出荷) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 153 | order.print_date11 | 出力済(モール連携処理済) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 154 | order.mail_date1 | メール送信済(サンクス) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 155 | order.mail_date2 | メール送信済(入金確認) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 156 | order.mail_date3 | メール送信済(発送完了) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 157 | order.mail_date4 | メール送信済(フォロー) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 158 | order.mail_date7 | メール送信済(その他1) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 159 | order.mail_date8 | メール送信済(その他2) | 半角数字 | 1 | | 0:出力なし 1:出力済 |
| 160 | order.convertion_flg | カゴ落ちリカバリー | 半角数字 | 1 | | 0:なし、1:あり |
| 161 | order.letter_id | お手紙ID | 半角/全角 | 9 | | |
| 162 | order.letter_name | お手紙名 | マスタ変換 | 50 | | マスタの名称と一致すること |
| 163 | order.letter_message | お手紙差込 | 半角/全角 | 65000 | | |
| 164 | order.print_message | 納品書差込 | 半角/全角 | 65000 | | |
| 165 | order.mail_message1 | サンクスメール差込 | 半角/全角 | 65000 | | |
| 166 | order.mail_message2 | 発送完了メール差込 | 半角/全角 | 65000 | | |
| 167 | order.mail_message3 | 入金確認メール差込 | 半角/全角 | 65000 | | |
| 168 | order.mail_message4 | フォローメール差込 | 半角/全角 | 65000 | | |
| 169 | order.mail_message7 | その他1メール差込 | 半角/全角 | 65000 | | |
| 170 | order.mail_message8 | その他2メール差込 | 半角/全角 | 65000 | | |
| 171 | order.jpon_order_id | 他システム受注番号 | 半角/全角 | 65000 | | |
| 172 | order.jpon_customer_code | 他システム顧客コード | 半角/全角 | 65000 | | |
| 173 | order.user_agent | USER AGENT | 半角/全角 | 65000 | | |
| 174 | order.remote_addr | 流入IP | 半角/全角 | 65000 | | |
| 175 | order.referrer_url | 流入URL | 半角/全角 | 65000 | | |
| 176 | order.referrer_url_param | 流入パラメーター | 半角/全角 | 65000 | | |
| 177 | order.exchange_use_point | 交換利用ポイント | 半角数字 | 9 | | |
| 178-186 | shipping.hasso_denpyo_code2〜10 | 送り状伝票番号2〜10 | 半角/全角 | 30 | | |
| 187 | order.payment_discount_memo | うち割引額4メモ | 半角/全角 | 50 | | |
| 188 | order.payment_discount | うち割引額4 | 半角数字 | 9 | | |
| 189 | order_group.group_order_id | 同梱ID | 半角数字 | 9 | | |
| 190 | order_group.group_order_type | 同梱タイプ | 半角数字 | 1 | | 0:未同梱 1:同梱(親) 2:同梱(子) |
| 191-199 | order_group.group_subtotal 他 | 同梱商品代金合計・調整額・送料・手数料・利用ポイント・利用クーポン・利用請求額・うち消費税・入金額 | 半角数字 | 9 | | |
| 200 | order_group.group_deliv_fee_cost | 同梱配送コスト | 半角数字 | 9 | | |
| 201 | order_group.group_tax_calc_type | 同梱消費税計算区分 | 半角/全角 | 10 | | 伝票単位、伝票単位(B)、明細単位 |
| 202-204 | order_group.group_total_tax 他 | 同梱合計額消費税・送料(税別)・手数料(税別) | 半角数字 | 9 | | |
| 205 | order_detail.product_no | ご購入明細番号 | 半角数字 | 11 | | |
| 206 | order_detail.detail_kbn | ご購入明細区分 | マスタ変換 | 50 | 〇 | マスタの名称と一致すること |
| 207 | order_detail.order_product_code | ご購入明細購入時商品コード | 半角/全角 | 200 | | |
| 208 | order_detail.product_code | ご購入明細商品コード | 半角/全角 | 200 | 〇 | **本システムのpt換算のキー** |
| 209 | order_detail.product_name | ご購入明細商品名 | 半角/全角 | 255 | 〇 | |
| 210 | order_detail.classcategory_name1 | ご購入明細規格名(横軸選択肢) | 半角/全角 | 50 | | |
| 211 | order_detail.classcategory_name2 | ご購入明細規格名(縦軸選択肢) | 半角/全角 | 50 | | |
| 212 | order_detail.product_option_name | ご購入明細選択肢名 | 半角/全角 | 3000 | | |
| 213 | order_detail.product_noshi_select | ご購入明細のし区分 | 半角/全角 | 50 | | |
| 214 | order_detail.product_noshi_name | ご購入明細のし名入 | 半角/全角 | 50 | | |
| 215 | order_detail.product_tax_flag | ご購入明細消費税区分 | 半角/全角 | 2 | 〇 | 別、込 |
| 216 | order_detail.tax_rule | ご購入明細消費税課税規則 | 半角数字 | 1 | 〇 | 1:四捨五入 2:切り捨て 3:切り上げ |
| 217 | order_detail.product_postage_flag | ご購入明細送料区分 | 半角/全角 | 2 | 〇 | 別、込 |
| 218 | order_detail.product_daibiki_flag | ご購入明細手数料区分 | 半角/全角 | 2 | 〇 | 別、込 |
| 219 | order_detail.product_price_notax | ご購入明細税抜単価 | 半角数字 | 9 | | 消費税区分が「別」の場合必須 |
| 220 | order_detail.product_price | ご購入明細税込単価 | 半角数字 | 9 | | 消費税区分が「込」の場合必須 |
| 221 | order_detail.product_tax | ご購入明細消費税 | 半角数字 | 9 | 〇 | |
| 222 | order_detail.tax_rate | ご購入明細消費税率 | 半角数字 | 9 | 〇 | |
| 223 | order_detail.product_quantity | ご購入明細数量 | 半角数字 | 9 | 〇 | **本システムのpt換算のキー** |
| 224 | order_detail.product_total | ご購入明細金額 | 半角数字 | 9 | 〇 | |
| 225 | order_detail.point | ご購入明細付与ポイント | 半角数字 | 9 | | |
| 226 | order_detail.point_rate | ご購入明細ポイント率 | 半角数字 | 9 | | |
| 227 | order_detail.point_rate_power | ご購入明細ポイント変倍率 | 半角数字 | 9 | | |
| 228 | order_detail.stock_price | ご購入明細税抜原価 | 半角数字 | 9 | | |
| 229 | order_detail.weight | ご購入明細重量 | 半角数字 | 9 | | |
| 230 | order_detail.product_reg_flag | ご購入明細定期区分 | マスタ変換 | 50 | 〇 | 定期、商品 |
| 231 | order_detail.order_jan_cd | ご購入明細JANコード | 半角/全角 | 50 | | |
| 232 | order_detail.order_lot_no | ご購入明細ロットNO | 半角/全角 | 50 | | |
| 233 | order_detail.base_price02 | ご購入明細標準販売価格 | 半角数字 | 9 | | |
| 234-240 | order_detail.b2b_trade_rate 他 | 掛け率・価格フラグ・割引タイプ/種別/率/額/額合計 | 半角数字 | 9 | | |
| 241 | order_detail.name_1 | ご購入明細商品略称(内部用) | 半角/全角 | 50 | | 更新不可 |
| 242 | order_detail.enclosures_flag | ご購入明細封入物区分 | 半角数字 | 1 | | 0:通常商品、1:封入物 |
| 243-244 | order_detail.b2b_price04_saron 他 | サロン価格(税込/税別) | 半角数字 | 1 | | |
| 245 | order_detail.common_code | ご購入明細商品管理番号 | 半角/全角 | 50 | | 更新不可 |
| 246 | order_detail.upcross_id | ご購入明細アップセルクロスセルID | 半角数字 | 9 | | |
| 247 | order_detail.upcross_code | ご購入明細アップセルクロスセルコード | 半角/全角 | 50 | | 更新不可 |
| 248-249 | order_detail.b2b_price04 他 | リベート計算価格(税込/税別) | 半角数字 | 1 | | |
| 250-251 | order_detail.box_unit_quantity 他 | ボックス個数・単位 | | | | 更新不可 |
| 252 | order_detail.price01 | ご購入明細表示価格 | 半角数字 | 9 | | |
| 253 | order_detail.product_periodical_order_id | ご購入明細定期申込ID | 半角数字 | 9 | | |
| 254 | order_detail.exchange_use_point_detail | ご購入明細交換利用ポイント | 半角数字 | 9 | | |
| 255 | order_detail.backorder_flag | ご購入明細在庫切れ時注文フラグ | 半角数字 | 9 | | 1:在庫切れ時注文 |
| 256 | order_detail.product_serial_no | ご購入明細商品製品番号 | 半角/全角 | 50 | | |
| 257-259 | order_detail.packing_name 他 | 荷姿名・入数・単位 | | | | 更新不可 |
| 260 | order_detail.product_weight_total | ご購入明細重量合計 | 半角数字 | 9 | | |
| 261 | order.create_date | 登録日時 | 時刻 | 19 | | 更新不可 |
| 262 | order.category_id | カテゴリID | 半角数字 | 9 | | 更新不可 |
| 263-266 | order.parent_customer_id 他 | 紹介者顧客ID・契約者コード・移行元紹介者顧客ID・紹介者名 | | | | 更新不可 |
| 267 | order.first_buy_day | 初回購入日 | 日付 | 10 | | 更新不可。出力時に負荷がかかる |
| 268 | order.first_commit_day | 初回出荷日 | 日付 | 10 | | 更新不可。出力時に負荷がかかる |
| 269-273 | order.coupon_serial_code 他 | クーポンシリアルコード・端末ID・更新日時・請求用代引金額・会員ステータス | | | | 更新不可 |
| 274-275 | order.teiki_course_code / name | 定期コースコード・名称 | 半角/全角 | 50 | | |
| 276-287 | order.price_after_discount 他 | 割引後単価/金額、楽天ポイント利用、売上金額にかかるポイント/クーポン/調整額(税率別1〜3) | 半角数字 | 9 | | |
| 288 | order.total_after_discount_sum | 割引計算後金額(税別)伝票合計 | 半角数字 | 9 | | 更新不可、出力時負荷 |
| 289-298 | order.cart_item_addition01〜10 | 追加項目1〜10 | 半角/全角 | 65000 | | |
| 299-313 | order.sales_amount_*_tax* 他 | 適格消費税対応の各種売上・税額(税率別1〜3) | 半角数字 | 9 | | |
| 314-315 | order.friend_campaign_code / name | 紹介キャンペーンコード・名 | | | | 更新不可 |
| 316-323 | order.bbc_member_* | BBC加盟店グループ/コード/名/得意先コード/スタッフID/名 | マスタ変換 | | | 一部更新不可 |
| 324-326 | order.b2b_member_code 他 | B2B加盟店コード/名/得意先コード | マスタ変換 | | | 一部更新不可 |
| 327-332 | order.member_sales_charge_id 他 | 営業担当者・カスタマー担当者・出荷担当者(ID/名) | | | | 更新不可 |
| 333-335 | order.sender_customer_flg 他 | 送り主フラグ・送り主注文番号・送り主コード | 半角/全角 | | | 0:注文者と同じ、1:送り主を指定する |
| 336 | order.customer_charge_department | カスタマー担当者所属 | 半角/全角 | 50 | | 更新不可 |
| 337-356 | order.member_genre01〜20 | 加盟店ジャンル1〜20 | 半角/全角 | 50 | | 更新不可 |
| 357 | order.tax_version | 軽減税率設定 | 半角数字 | 1 | | 0:全商品一律、1:商品別(軽減税率) |
| 358-367 | order.sales_amount_total0〜2 他 | 適格消費税対象売上金額/税率/消費税(1〜3)、消費税対象消費税総額 | 半角数字 | 9 | | |
| 368-377 | order_group.group_sales_amount_* | 同梱版の適格消費税対象売上金額/税率/消費税(1〜3)、総額 | 半角数字 | 9 | | |
| 378-420 | order.gmo_order_id 他 | 決済代行(GMO/ZEUS/クロネコWebコレクト/SBPS/AmazonPay/atone/paidy/DGFT/楽天カード/PAYGATE/楽天ペイ/後払い)関連の各種取引ID・金額・ステータス項目一式 | 各種 | | | 決済手段ごとの連携情報 |
| 421-435 | periodical_order.* | 定期購入関連(定期申込ID・お届けサイクル・受注周期タイプ・間隔日数・毎月お届け日・お届け間隔月・お届け週・曜日・次回お届け予定日・お届け時間帯・受注作成時の定期情報) | 各種 | | | 出力時に負荷がかかる。詳細は原文参照 |
| 436-438 | order.combined_payment_id 他 | 併用支払方法ID/名/金額 | | | | |
| 439-440 | order.customer_payment_date 他 | 顧客入金日・返品処理日 | 日付 | 10 | | |
| 441 | order.ec_customer_id | EC顧客ID | 半角数字 | 9 | | |
| 442-447 | order.oplux_* 他 | O-PLUX不正検知連携(イベントID・自動/目視審査結果・メモ・締切日時)、売れるネット×後払い.comフラグ | 各種 | | | |
| 448-453 | order.former_total 他 | (旧)合計額・商品代金合計(税別)・スマレジ会員ID/コード・見積ID・バージョン | 各種 | | | 更新不可 |

備考: TELは半角数字・ハイフン、日付は`YYYY-MM-DD`(`/`区切り可)、時刻は`YYYY-MM-DD hh:mm:ss`(`/`区切り可)。

---

## 4. ログインAPI

### API情報

| 項目 | 内容 |
|---|---|
| API名 | ログインAPI |
| 概要 | ログイン処理するインターフェースを提供します。 |
| エンドポイント | `https://www.primedirect.jp/api/v2/cart` |

### `[POST] /api/v2/cart/login`

概要: ログインID、パスワードを指定し、ログイン結果を返却します。

**request項目**

| キー | 値 |
|---|---|
| email | メールアドレス |
| password | パスワード |

**response項目**

| キー | 値 | 説明 |
|---|---|---|
| redirect_url | リダイレクト先 | ログイン後のページ。自動ではリダイレクトされない |
| customer_id | 顧客ID | 他カート系APIでログイン状態を引き継ぐ場合に利用 |
| session_name | セッション名 | 同上 |
| session_id | セッションID | 同上 |

> **設計メモ**: このAPIの存在から、`order.customer_id`はEC会員登録(今回は「フォーム入力=会員登録」のLP経由)によって必ず払い出されるIDであることが確認できる(HANDOVER.md 5.3参照)。

---

## 5. 認証(OAuth2 / 外部アプリ連携)

設定画面: 基本設定 > 外部アプリ連携

### 5.1 アプリケーション登録

| 項目 | 内容 |
|---|---|
| アプリケーション名 | 任意 |
| リダイレクトURL | 認証情報を受け取るURLを指定 |
| IP制限 | 許可するIPアドレス。未設定の場合は無制限 |
| クライアントID | 新規登録時は空欄。登録すると発行される |
| シークレットID | 新規登録時は空欄。登録すると発行される |

### 5.2 認証ページ表示

`GET https://{ドメイン名}/api/oauth/authorize.php` に以下のパラメータを付けてアクセス。

| パラメータ名 | 有効な値 |
|---|---|
| client_id | アプリケーション詳細画面で確認できるクライアントID |
| response_type | "code"を指定 |
| redirect_uri | アプリケーション登録時に入力したリダイレクトURLと同一 |
| state | 任意の文字列 |
| scope | アプリが利用したい機能をスペース区切りで指定。`read_products`=商品データ参照、`write_products`=在庫データ更新、`read_sales`=受注・顧客データ参照、`write_sales`=受注データ更新 |

例: `https://{ドメイン}/api/oauth/authorize.php?client_id=CLIENT_ID&redirect_uri=REDIRECT_URL&response_type=code&state=xxxxx`

### 5.3 認可コード取得

リダイレクトURLに `?code=xxxxxxxxx&state=zzzzzzzzz` の形式でクエリが付与される。`code`が認可コード。

### 5.4 アクセストークン取得

`POST https://{ドメイン名}/api/oauth/token.php`

**リクエストパラメータ**

| パラメータ名 | 有効な値 |
|---|---|
| client_id | クライアントID |
| client_secret | シークレット文字列 |
| code | 取得した認可コード |
| grant_type | "client_credentials"を指定(※命名はOAuth2標準のauthorization_codeに相当する処理だが、本APIの仕様通りclient_credentialsを指定する) |

**レスポンス**

```json
{"access_token":"d461ab8XXXXXXXXXXXXXXXXXXXXXXXXX","token_type":"bearer","expires_in":null,"refresh_token":null,"scope":""}
```

> - 認可コードをアクセストークンに交換できるのは**1度だけ**。アプリケーション側で保存すること。
> - アクセストークンは、許可済みアプリケーション一覧画面から失効させることができる。
> - `expires_in`/`refresh_token`がnullの実例が示されている(有効期限が無い可能性があるが未検証)。

### 5.5 API呼び出し

`Authorization: Bearer {access_token}` ヘッダを付与してリクエストする。POST/PUTは`Content-Type: application/json`、日本語を含むJSONはUTF-8/`\uNNNN`形式でエンコード。GET=参照、POST=新規登録、PUT=更新、DELETE=削除。

> **実装済み**: `src/lib/smaregi/oauth.ts` と `/api/smaregi/oauth/{start,callback}` がこのフローを実装している。手順はHANDOVER.md 5.3.1参照。
