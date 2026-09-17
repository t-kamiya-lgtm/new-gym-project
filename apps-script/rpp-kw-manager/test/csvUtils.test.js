// Plain Node test (no framework) — run with: node test/csvUtils.test.js
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var CsvUtils = require('../src/CsvUtils.js');
var Constants = require('../src/Constants.js');

var fixturePath = path.join(__dirname, 'fixtures', 'rpp_report_sample.csv');
var text = fs.readFileSync(fixturePath, 'utf8');

var rows = CsvUtils.parseCsvText(text);

// 7 preamble lines (incl. 2 blank/quoted-empty rows) before the real header.
var headerIndex = CsvUtils.findHeaderRowIndex(rows, 'コントロールカラム');
assert.notStrictEqual(headerIndex, -1, 'header row should be found');
assert.strictEqual(rows[headerIndex][1], '日付');
assert.strictEqual(rows[headerIndex][3], '商品管理番号');
assert.strictEqual(rows[headerIndex][4], 'キーワード');

var records = CsvUtils.rowsToObjects(rows, headerIndex);
assert.strictEqual(records.length, 6, 'should parse all 6 data rows (incl. non-target products)');

// Filter down to Monster/Soba only, the way the real importer does.
var targetRecords = records.filter(function (r) {
  return Object.prototype.hasOwnProperty.call(
    Constants.PRODUCT_ITEM_CODE_MAP,
    r['商品管理番号']
  );
});
assert.strictEqual(targetRecords.length, 4, 'should keep only pm/pm_sova rows (excludes 玄米パック, 土鍋)');

var takaTanpaku = targetRecords.filter(function (r) {
  return r['キーワード'] === '高たんぱく';
})[0];
assert.ok(takaTanpaku, '高たんぱく row should survive filtering');
assert.strictEqual(takaTanpaku['目安CPC'], '3714');
assert.strictEqual(takaTanpaku['CPC実績(合計)'], '52');
assert.strictEqual(Constants.PRODUCT_ITEM_CODE_MAP[takaTanpaku['商品管理番号']], 'Monster');

var sobaRow = targetRecords.filter(function (r) {
  return r['商品管理番号'] === 'pm_sova';
})[0];
assert.ok(sobaRow, 'Soba row should survive filtering');
assert.strictEqual(Constants.PRODUCT_ITEM_CODE_MAP[sobaRow['商品管理番号']], 'Soba');
assert.strictEqual(sobaRow['売上件数(合計720時間)'], '1');

// Column-mapping coverage: every mapped source column must actually exist in the header.
var header = rows[headerIndex];
Object.keys(Constants.RPP_CSV_COLUMN_MAP).forEach(function (sourceCol) {
  assert.ok(
    header.indexOf(sourceCol) !== -1,
    'RPP_CSV_COLUMN_MAP references a column not present in the real CSV header: ' + sourceCol
  );
});

// Period parsing
var period = CsvUtils.parsePeriodRangeJa(targetRecords[0]['日付']);
assert.strictEqual(period.start, '2026-09-01');
assert.strictEqual(period.end, '2026-09-16');

// Fallback header guesser, used by the other-promo importer for formats we
// haven't confirmed yet (docs section 12). Should skip single-cell preamble
// lines and land on the first row that looks like a real table header.
var guessed = CsvUtils.guessTabularHeaderRowIndex(rows, 3);
assert.strictEqual(guessed, headerIndex, 'fallback guesser should agree with the exact marker match on this file');

console.log('CsvUtils tests passed (' + targetRecords.length + ' target rows, header at index ' + headerIndex + ').');
