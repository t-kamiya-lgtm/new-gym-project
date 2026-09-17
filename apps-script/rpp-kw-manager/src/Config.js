/**
 * Script Properties access. Set these once via
 * Apps Script editor > Project Settings > Script properties,
 * or run `setScriptProperties_()` below with real values filled in.
 *
 * Required keys:
 *   RAKUTEN_APP_ID                    楽天Web ServiceアプリのアプリケーションID(2026年2月移行後はUUID形式)
 *   RAKUTEN_ACCESS_KEY                同アプリのアクセスキー(2026年2月のAPI移行で追加された認証情報。11章参照)
 *   SPREADSHEET_ID                    このKW管理表スプレッドシートのID
 *   RPP_REPORT_FOLDER_ID              RPPレポートCSVを投入するDriveフォルダ
 *   RPP_REPORT_PROCESSED_FOLDER_ID    取込済みRPPレポートの退避先フォルダ
 *   OTHER_PROMO_FOLDER_ID             楽天内の他施策レポート(クーポンアドバンス等)を投入するDriveフォルダ
 *   OTHER_PROMO_PROCESSED_FOLDER_ID   取込済み他施策レポートの退避先フォルダ
 *   SHOP_CODE                         楽天店舗コード。省略時は 'florahouse'
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();
  var config = {
    RAKUTEN_APP_ID: props.getProperty('RAKUTEN_APP_ID'),
    RAKUTEN_ACCESS_KEY: props.getProperty('RAKUTEN_ACCESS_KEY'),
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID'),
    RPP_REPORT_FOLDER_ID: props.getProperty('RPP_REPORT_FOLDER_ID'),
    RPP_REPORT_PROCESSED_FOLDER_ID: props.getProperty('RPP_REPORT_PROCESSED_FOLDER_ID'),
    OTHER_PROMO_FOLDER_ID: props.getProperty('OTHER_PROMO_FOLDER_ID'),
    OTHER_PROMO_PROCESSED_FOLDER_ID: props.getProperty('OTHER_PROMO_PROCESSED_FOLDER_ID'),
    SHOP_CODE: props.getProperty('SHOP_CODE') || 'florahouse',
  };
  return config;
}

/** Fails fast with a clear message instead of a cryptic null-pointer deep in Drive/Sheets calls. */
function requireConfig_(keys) {
  var config = getConfig();
  var missing = keys.filter(function (k) {
    return !config[k];
  });
  if (missing.length > 0) {
    throw new Error(
      '未設定のScript Propertiesがあります: ' +
        missing.join(', ') +
        ' — プロジェクト設定 > スクリプト プロパティ で設定してください。'
    );
  }
  return config;
}

/**
 * Convenience one-time setup. Fill in the real IDs and run this once from the
 * Apps Script editor, then delete/ignore it (Script Properties persist).
 */
function setScriptProperties_() {
  PropertiesService.getScriptProperties().setProperties(
    {
      RAKUTEN_APP_ID: 'REPLACE_ME',
      RAKUTEN_ACCESS_KEY: 'REPLACE_ME',
      SPREADSHEET_ID: 'REPLACE_ME',
      RPP_REPORT_FOLDER_ID: 'REPLACE_ME',
      RPP_REPORT_PROCESSED_FOLDER_ID: 'REPLACE_ME',
      OTHER_PROMO_FOLDER_ID: 'REPLACE_ME',
      OTHER_PROMO_PROCESSED_FOLDER_ID: 'REPLACE_ME',
      SHOP_CODE: 'florahouse',
    },
    /* deleteAllOthers= */ false
  );
}

function getSpreadsheet_() {
  var config = requireConfig_(['SPREADSHEET_ID']);
  return SpreadsheetApp.openById(config.SPREADSHEET_ID);
}
