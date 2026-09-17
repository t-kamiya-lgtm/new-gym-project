/**
 * Imports "楽天内の他施策レポート" (クーポンアドバンス等) dropped into
 * OTHER_PROMO_FOLDER_ID. See docs/rakuten-rpp-management-design.md section 12.
 *
 * The exact column format of these reports hasn't been confirmed yet (unlike
 * the RPP report, which was verified against a real export). Rather than
 * guessing a wrong mapping, this importer does a lossless "raw" import: every
 * row becomes one row in 他施策ログ with its original columns preserved as
 * JSON, tagged with the source file name and a best-effort report-type guess
 * from the file name. Once a real sample of each report type is available,
 * add a dedicated column mapping the same way RppReportImporter.js does
 * (RPP_CSV_COLUMN_MAP), rather than parsing the JSON blob downstream.
 */

function importOtherPromoReports() {
  var config = requireConfig_([
    'OTHER_PROMO_FOLDER_ID',
    'OTHER_PROMO_PROCESSED_FOLDER_ID',
    'SPREADSHEET_ID',
  ]);
  var folder = DriveApp.getFolderById(config.OTHER_PROMO_FOLDER_ID);
  var processedFolder = DriveApp.getFolderById(config.OTHER_PROMO_PROCESSED_FOLDER_ID);
  var spreadsheet = SpreadsheetApp.openById(config.SPREADSHEET_ID);

  var files = folder.getFiles();
  var importedCount = 0;
  var errors = [];

  while (files.hasNext()) {
    var file = files.next();
    if (!/\.csv$/i.test(file.getName())) {
      continue;
    }
    try {
      var rowCount = importSingleOtherPromoReport_(spreadsheet, file);
      logImport_(spreadsheet, {
        type: '他施策レポート',
        fileName: file.getName(),
        rowCount: rowCount,
        periodStart: '',
        periodEnd: '',
        status: 'OK',
        detail: '生データ取込(列マッピング未確定)',
      });
      file.moveTo(processedFolder);
      importedCount++;
    } catch (e) {
      errors.push(file.getName() + ': ' + e.message);
      logImport_(spreadsheet, {
        type: '他施策レポート',
        fileName: file.getName(),
        rowCount: 0,
        periodStart: '',
        periodEnd: '',
        status: 'ERROR',
        detail: e.message,
      });
    }
  }

  Logger.log('他施策レポート取込完了: ' + importedCount + '件, エラー' + errors.length + '件');
  return { importedCount: importedCount, errors: errors };
}

function importSingleOtherPromoReport_(spreadsheet, file) {
  var text = file.getBlob().getDataAsString('Shift_JIS');
  var rows = parseCsvText(text);
  var headerIndex = guessTabularHeaderRowIndex(rows, 3);
  if (headerIndex === -1) {
    throw new Error('表形式のヘッダー行が見つかりません(3列以上ある行が無い)。');
  }
  var records = rowsToObjects(rows, headerIndex);
  var sheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.OTHER_PROMO_LOG);
  var now = new Date();
  var reportType = guessReportType_(file.getName());

  records.forEach(function (record) {
    sheet.appendRow([now, reportType, file.getName(), JSON.stringify(record)]);
  });
  return records.length;
}

function guessReportType_(fileName) {
  if (fileName.indexOf('coupon') !== -1 || fileName.indexOf('クーポン') !== -1) {
    return 'クーポンアドバンス';
  }
  return '不明(ファイル名から自動判定できず)';
}
