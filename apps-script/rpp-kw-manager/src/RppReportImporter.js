/**
 * Imports RMS RPP report CSVs dropped into RPP_REPORT_FOLDER_ID.
 * Format confirmed against a real export on 2026-09-17 — see
 * docs/rakuten-rpp-management-design.md section 4-1 for the full column
 * mapping and the reasoning behind each design choice referenced here.
 */

/** Entry point for the Mon/Thu trigger and the spreadsheet menu. */
function importRppReports() {
  var config = requireConfig_([
    'RPP_REPORT_FOLDER_ID',
    'RPP_REPORT_PROCESSED_FOLDER_ID',
    'SPREADSHEET_ID',
  ]);
  var folder = DriveApp.getFolderById(config.RPP_REPORT_FOLDER_ID);
  var processedFolder = DriveApp.getFolderById(config.RPP_REPORT_PROCESSED_FOLDER_ID);
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
      var result = importSingleRppReport_(spreadsheet, file);
      logImport_(spreadsheet, {
        type: 'RPPレポート',
        fileName: file.getName(),
        rowCount: result.rowCount,
        periodStart: result.period.start,
        periodEnd: result.period.end,
        status: 'OK',
        detail: '',
      });
      file.moveTo(processedFolder);
      importedCount++;
    } catch (e) {
      errors.push(file.getName() + ': ' + e.message);
      logImport_(spreadsheet, {
        type: 'RPPレポート',
        fileName: file.getName(),
        rowCount: 0,
        periodStart: '',
        periodEnd: '',
        status: 'ERROR',
        detail: e.message,
      });
    }
  }

  if (errors.length > 0) {
    // Surface failures loudly (execution transcript + optionally email) rather than
    // silently leaving a file stuck in the inbox folder.
    Logger.log('RPPレポート取込エラー:\n' + errors.join('\n'));
  }
  Logger.log('RPPレポート取込完了: ' + importedCount + '件, エラー' + errors.length + '件');
  return { importedCount: importedCount, errors: errors };
}

function importSingleRppReport_(spreadsheet, file) {
  var text = file.getBlob().getDataAsString('Shift_JIS');
  var rows = parseCsvText(text);
  var headerIndex = findHeaderRowIndex(rows, 'コントロールカラム');
  if (headerIndex === -1) {
    throw new Error('ヘッダー行(「コントロールカラム」列)が見つかりません。CSVフォーマットが変わった可能性があります。');
  }
  var records = rowsToObjects(rows, headerIndex);
  var targetRecords = records.filter(function (r) {
    return Object.prototype.hasOwnProperty.call(PRODUCT_ITEM_CODE_MAP, r['商品管理番号']);
  });

  var period = { start: null, end: null };
  if (targetRecords.length > 0) {
    period = parsePeriodRangeJa(targetRecords[0]['日付']);
  }

  upsertKwRecords_(spreadsheet, targetRecords, period);
  return { rowCount: targetRecords.length, period: period };
}

function upsertKwRecords_(spreadsheet, records, period) {
  var sheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.KW_MASTER);
  var colIndex = getHeaderIndexMap_(sheet);
  var rowIndex = buildKwRowIndex_(sheet, colIndex);
  var now = new Date();

  records.forEach(function (record) {
    var product = PRODUCT_ITEM_CODE_MAP[record['商品管理番号']];
    var kw = record['キーワード'];
    var fields = mapRppRecordToFields_(record);
    fields['最終実績更新'] = now;
    if (period.start) fields['集計開始日'] = period.start;
    if (period.end) fields['集計終了日'] = period.end;

    var key = kwKey_(product, kw);
    var existingRow = rowIndex[key];
    if (existingRow) {
      writeRowFields_(sheet, existingRow, colIndex, fields);
    } else {
      fields['商品'] = product;
      fields['KW'] = kw;
      fields['運用ステータス'] = fields['運用ステータス'] || '要確認(新規検出)';
      // NOTE: appendRowSparse_ only writes the given fields — it deliberately
      // never touches 目標CPA/目標ROAS/判定/次アクション so the ARRAYFORMULA
      // in row 2 of those columns can spill into this new row (see SheetUtils.js).
      var newRow = appendRowSparse_(sheet, colIndex, fields);
      // keep the in-memory index correct in case the same file lists a KW twice
      rowIndex[key] = newRow;
    }
  });
}

/** Applies RPP_CSV_COLUMN_MAP and does the numeric coercion RMS's CSV needs (plain strings otherwise). */
function mapRppRecordToFields_(record) {
  var fields = {};
  Object.keys(RPP_CSV_COLUMN_MAP).forEach(function (sourceCol) {
    var targetCol = RPP_CSV_COLUMN_MAP[sourceCol];
    var raw = record[sourceCol];
    if (raw === undefined || raw === '') {
      return; // leave existing value untouched rather than overwriting with blank
    }
    fields[targetCol] = coerceNumberIfPossible_(raw);
  });
  return fields;
}

function coerceNumberIfPossible_(value) {
  if (typeof value !== 'string') return value;
  var trimmed = value.trim();
  if (trimmed === '') return value;
  var n = Number(trimmed);
  return isNaN(n) ? value : n;
}

function logImport_(spreadsheet, entry) {
  var sheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.IMPORT_LOG);
  sheet.appendRow([
    new Date(),
    entry.type,
    entry.fileName,
    entry.rowCount,
    entry.periodStart,
    entry.periodEnd,
    entry.status,
    entry.detail,
  ]);
}
