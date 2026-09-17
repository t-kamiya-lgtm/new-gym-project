/**
 * Adds a custom menu so the operator can trigger imports/setup manually from
 * the spreadsheet UI, without opening the Apps Script editor.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('RPP管理')
    .addItem('初期セットアップ(初回のみ)', 'runInitialSetup')
    .addItem('週次トリガー設置(月・木 朝6時)', 'installTriggers')
    .addSeparator()
    .addItem('今すぐ更新(RPP取込+他施策取込+順位チェック)', 'runMonThuJobs')
    .addItem('RPPレポートだけ取込', 'importRppReports')
    .addItem('他施策レポートだけ取込', 'importOtherPromoReports')
    .addItem('自然検索順位だけチェック', 'checkOrganicRanks')
    .addToUi();
}
