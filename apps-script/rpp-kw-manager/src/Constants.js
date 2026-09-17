/**
 * Constants shared across the RPP KW manager scripts.
 * Kept dependency-free (no GAS globals) so it can be loaded from Node tests too.
 */

var SHEET_NAMES = {
  KW_MASTER: 'RPP_KW管理表',
  DASHBOARD: 'ダッシュボード',
  SETTINGS: '設定',
  IMPORT_LOG: '取込ログ',
  RANK_LOG: '順位履歴ログ',
  OTHER_PROMO_LOG: '他施策ログ',
  EXTERNAL_MARKETING_LOG: '外部施策ログ(手入力)',
};

// RPPレポートCSVの「商品管理番号」→ 商品名。設計書 4-1 参照。
var PRODUCT_ITEM_CODE_MAP = {
  pm: 'Monster',
  pm_sova: 'Soba',
};

// 楽天市場商品検索APIで使う itemCode (shopCode:itemUrlCode)。設計書 11章 参照(要API疎通検証)。
var PRODUCT_RAKUTEN_ITEM_CODE = {
  Monster: 'florahouse:pm',
  Soba: 'florahouse:pm_sova',
};

// RPP_KW管理表の列。この配列の並び順がシートの列順になる(SetupSpreadsheet.js 参照)。
var KW_MASTER_COLUMNS = [
  '商品',
  'KW',
  'KW分類',
  '優先度',
  '競合',
  '運用ステータス',
  '現CPC',
  '目安CPC',
  '実績CPC',
  '広告表示順位',
  '自然検索順位',
  '自然検索順位_取得日',
  'ライン',
  'Click',
  'CV(720h)',
  '新規CV(720h)',
  'CVR',
  '広告費',
  '売上(720h)',
  'ROAS',
  'CPA実績(720h)',
  '目標CPA',
  '目標ROAS',
  '判定',
  '推奨CPC',
  '次アクション',
  '最終実績更新',
  '集計開始日',
  '集計終了日',
  '今回設定CPC',
];

// 4-1で確定したRPP CSVの列名 → KW_MASTER_COLUMNS への反映先マッピング。
var RPP_CSV_COLUMN_MAP = {
  '目安CPC': '目安CPC',
  'キーワードCPC': '現CPC',
  'CPC実績(合計)': '実績CPC',
  'クリック数(合計)': 'Click',
  '実績額(合計)': '広告費',
  '売上金額(合計720時間)': '売上(720h)',
  '売上件数(合計720時間)': 'CV(720h)',
  '売上件数(新規720時間)': '新規CV(720h)',
  'CVR(合計720時間)(%)': 'CVR',
  'ROAS(合計720時間)(%)': 'ROAS',
  '注文獲得単価(合計720時間)': 'CPA実績(720h)',
};

if (typeof module !== 'undefined') {
  module.exports = {
    SHEET_NAMES: SHEET_NAMES,
    PRODUCT_ITEM_CODE_MAP: PRODUCT_ITEM_CODE_MAP,
    PRODUCT_RAKUTEN_ITEM_CODE: PRODUCT_RAKUTEN_ITEM_CODE,
    KW_MASTER_COLUMNS: KW_MASTER_COLUMNS,
    RPP_CSV_COLUMN_MAP: RPP_CSV_COLUMN_MAP,
  };
}
