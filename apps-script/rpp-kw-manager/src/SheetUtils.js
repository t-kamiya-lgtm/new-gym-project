/**
 * Small helpers for reading/writing the KW_MASTER sheet by column name instead
 * of raw column index, so the importer code doesn't break if columns are
 * reordered later.
 */

function getSheetOrThrow_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(
      'シート「' + sheetName + '」が見つかりません。先に初期セットアップ(runInitialSetup)を実行してください。'
    );
  }
  return sheet;
}

/** Reads a sheet's header row (row 1) into a {columnName: 1-based index} map. */
function getHeaderIndexMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return {};
  }
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  header.forEach(function (name, i) {
    if (name) {
      map[name] = i + 1; // 1-based column index
    }
  });
  return map;
}

/**
 * Builds a lookup of existing KW_MASTER rows keyed by "商品||KW" -> 1-based row number,
 * so the importer can upsert instead of blindly appending duplicates.
 */
function buildKwRowIndex_(sheet, colIndex) {
  var lastRow = sheet.getLastRow();
  var index = {};
  if (lastRow < 2) {
    return index;
  }
  var productCol = colIndex['商品'];
  var kwCol = colIndex['KW'];
  var values = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();
  values.forEach(function (row, i) {
    var key = row[productCol - 1] + '||' + row[kwCol - 1];
    index[key] = i + 2; // 1-based row number, +1 for header, +1 for 0-index
  });
  return index;
}

function kwKey_(product, kw) {
  return product + '||' + kw;
}

/** Writes {columnName: value} into a specific row, leaving other columns untouched. */
function writeRowFields_(sheet, rowNumber, colIndex, fields) {
  Object.keys(fields).forEach(function (name) {
    var col = colIndex[name];
    if (!col) {
      return; // unknown column name — ignore rather than throw, keeps importer resilient
    }
    sheet.getRange(rowNumber, col).setValue(fields[name]);
  });
}

/**
 * Appends a new row, writing ONLY the given {columnName: value} fields and
 * leaving every other cell truly empty (not ''). This matters a lot here:
 * 目標CPA/目標ROAS/判定/次アクション are driven by a single ARRAYFORMULA in
 * row 2 that auto-expands into any new row below as long as that row's cell
 * is genuinely empty. Writing an explicit '' into it (e.g. via a naive
 * sheet.appendRow([...]) with blanks for unknown fields) blocks the spill
 * and produces a #REF! "would overwrite existing data" error. Returns the
 * new row's 1-based row number.
 */
function appendRowSparse_(sheet, colIndex, fields) {
  var newRow = sheet.getLastRow() + 1;
  Object.keys(fields).forEach(function (name) {
    var col = colIndex[name];
    if (!col) {
      return; // unknown column name — ignore rather than throw, keeps importer resilient
    }
    sheet.getRange(newRow, col).setValue(fields[name]);
  });
  return newRow;
}
