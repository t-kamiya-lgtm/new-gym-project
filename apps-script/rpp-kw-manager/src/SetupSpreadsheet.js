/**
 * One-time (idempotent) setup: creates every sheet from
 * docs/rakuten-rpp-management-design.md section 5, with headers, the 設定
 * pricing/threshold tables (as live formulas, not hardcoded numbers, so
 * editing 設定 recalculates everything downstream), and the ARRAYFORMULA
 * judgment logic in RPP_KW管理表.
 *
 * Run `runInitialSetup` once from the Apps Script editor (or the custom menu)
 * after filling in Script Properties (see Config.js). Safe to re-run — it
 * only creates sheets/headers that don't already exist and never touches
 * existing KW rows.
 */

function runInitialSetup() {
  var spreadsheet = getSpreadsheet_();
  setupKwMasterSheet_(spreadsheet);
  setupSettingsSheet_(spreadsheet);
  setupImportLogSheet_(spreadsheet);
  setupRankLogSheet_(spreadsheet);
  setupOtherPromoLogSheet_(spreadsheet);
  setupExternalMarketingLogSheet_(spreadsheet);
  setupDashboardSheet_(spreadsheet);
  installKwMasterFormulas_(spreadsheet);
  SpreadsheetApp.flush();
  Logger.log('初期セットアップ完了。');
}

function getOrCreateSheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}

function setHeaderRowIfEmpty_(sheet, headerValues) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headerValues.length).setValues([headerValues]);
    sheet.setFrozenRows(1);
  }
}

function setupKwMasterSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.KW_MASTER);
  setHeaderRowIfEmpty_(sheet, KW_MASTER_COLUMNS);
}

function setupImportLogSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.IMPORT_LOG);
  setHeaderRowIfEmpty_(sheet, [
    '取込日時',
    '種別',
    'ファイル名',
    '取込行数',
    '集計開始日',
    '集計終了日',
    'ステータス',
    '詳細',
  ]);
}

function setupRankLogSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.RANK_LOG);
  setHeaderRowIfEmpty_(sheet, [
    '日付',
    '商品',
    'KW',
    '設定CPC',
    '広告表示順位(手動)',
    '自然検索順位(自動)',
  ]);
}

function setupOtherPromoLogSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.OTHER_PROMO_LOG);
  setHeaderRowIfEmpty_(sheet, ['取込日時', 'レポート種別', 'ファイル名', '生データ(JSON)']);
}

function setupExternalMarketingLogSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.EXTERNAL_MARKETING_LOG);
  setHeaderRowIfEmpty_(sheet, ['年月', '施策名(Meta広告/インフルエンサー等)', '実施有無', '予算', 'メモ']);
  if (sheet.getLastRow() === 1) {
    sheet
      .getRange(2, 1, 1, 5)
      .setValues([['例: 2026-09', 'インフルエンサー施策', '縮小', '', '9-1章参照。自由記述でOK']]);
  }
}

function setupDashboardSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.DASHBOARD);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1).setValue('ダッシュボード(手動でピボットテーブル/フィルタを組んでください)');
    sheet
      .getRange(2, 1)
      .setValue(
        '推奨構成: 攻める候補Top N / 停止候補 / 要改善KW / 自然検索順位下落KW / 店舗全体KPI推移 / 外部施策実施状況(設計書5章・9-1章参照)'
      );
  }
}

/**
 * 設定シート: パラメータ(行1-7)+ 商品×ラインの目標CPA/ROASテーブル(行9-15、数式)
 * + 判定→次アクションの対応表(行17-)。
 */
function setupSettingsSheet_(spreadsheet) {
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAMES.SETTINGS);
  if (sheet.getLastRow() > 0) {
    return; // 既に設定済みなら上書きしない(手動調整済みの値を壊さないため)
  }

  sheet.getRange('A1:B1').setValues([['パラメータ', '値']]);
  sheet
    .getRange('A2:B7')
    .setValues([
      ['目標増し分利益率', 0.1],
      ['販売手数料率', 0.15],
      ['支払い手数料率', 0.02],
      ['自然検索順位_圏外しきい値', 150],
      ['広告表示順位_良好しきい値', 5],
      ['データ最小サンプルClick数', 10],
    ]);

  // 商品×ラインの目標CPA/ROASテーブル。原価・SKU価格は PricingModel.js と一致させること。
  sheet
    .getRange('A9:L9')
    .setValues([
      [
        '検索キー',
        '商品',
        'ライン',
        'セット食数',
        'SKU',
        '販売価格',
        '原価10食あたり',
        '変動費',
        '増し分利益',
        '増し分利益率',
        '目標CPA',
        '目標ROAS(%)',
      ],
    ]);

  var lineRows = [
    ['Monster', '新規獲得ライン', 10, 'PM100', 3320, 700],
    ['Monster', '標準ライン', 20, 'PM200', 6480, 700],
    ['Monster', '大容量ライン', 30, 'PM300', 9480, 700],
    ['Soba', '新規獲得ライン', 10, 'PM403', 3320, 770],
    ['Soba', '標準ライン', 20, 'PM404', 6480, 770],
    ['Soba', '大容量ライン', 30, 'PM405', 9480, 770],
  ];

  for (var i = 0; i < lineRows.length; i++) {
    var r = 10 + i;
    var product = lineRows[i][0];
    var line = lineRows[i][1];
    var servings = lineRows[i][2];
    var sku = lineRows[i][3];
    var price = lineRows[i][4];
    var unitCost10 = lineRows[i][5];

    sheet.getRange(r, 1).setFormula('=B' + r + '&"|"&C' + r); // 検索キー
    sheet.getRange(r, 2, 1, 4).setValues([[product, line, servings, sku]]);
    sheet.getRange(r, 6).setValue(price); // 販売価格
    sheet.getRange(r, 7).setValue(unitCost10); // 原価10食あたり
    // 変動費 = 原価10食あたり×セット食数/10 + (セット食数<20 ? 400 : 500)
    sheet.getRange(r, 8).setFormula('=G' + r + '*D' + r + '/10+IF(D' + r + '<20,400,500)');
    // 増し分利益 = 販売価格×(1-販売手数料率-支払手数料率) - 変動費
    sheet
      .getRange(r, 9)
      .setFormula('=F' + r + '*(1-$B$3-$B$4)-H' + r);
    // 増し分利益率
    sheet.getRange(r, 10).setFormula('=I' + r + '/F' + r);
    // 目標CPA = 増し分利益 - 目標増し分利益率×販売価格
    sheet.getRange(r, 11).setFormula('=I' + r + '-$B$2*F' + r);
    // 目標ROAS(%) = 1/(増し分利益率-目標増し分利益率)*100 (到達不可なら空欄)
    sheet
      .getRange(r, 12)
      .setFormula('=IFERROR(1/(J' + r + '-$B$2)*100,"")');
  }

  // 判定→次アクションの対応表
  sheet.getRange('A17:B17').setValues([['判定', '次アクション']]);
  sheet
    .getRange('A18:B25')
    .setValues([
      ['入札非推奨(単価が見合わない)', 'CVRの実績が出るまで非入稿維持、または目安CPCが下がるまで様子見'],
      ['データ蓄積中', '判定保留。Clickが最小サンプルに達するまで様子見'],
      ['要改善(CV0)', 'CPC実績が目安CPCに対し極端に低い場合はCPC見直し、そうでなければ除外KW化を検討'],
      ['好調・守る', 'CPC現状維持。定期モニタリングのみ'],
      ['要改善', 'CPC減額 or 除外KW化を検討'],
      ['攻める候補', '新規入稿(テストCPC)を検討。ただし目安CPC>目標CPAのKWは対象外(足切りルール)'],
      ['守る(現状維持)', '入稿不要。自然検索順位を定期モニタリング'],
      ['要確認', '判定条件に当てはまらないため手動で確認してください'],
    ]);

  sheet.autoResizeColumns(1, 12);
}

/**
 * KW_MASTERの計算列(目標CPA/目標ROAS/判定/次アクション)にARRAYFORMULAを設置する。
 * 2行目に1回設置すれば、開いた列全体(2:2以下すべて)に自動適用される(Google Sheetsの挙動)。
 * 既存の数式を壊さないよう、既にF2セル等に値が入っている場合は上書きしない。
 */
function installKwMasterFormulas_(spreadsheet) {
  var sheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.KW_MASTER);
  var colIndex = getHeaderIndexMap_(sheet);

  var col = {
    product: colLetter_(colIndex['商品']),
    status: colLetter_(colIndex['運用ステータス']),
    estimatedCpc: colLetter_(colIndex['目安CPC']),
    naturalRank: colLetter_(colIndex['自然検索順位']),
    line: colLetter_(colIndex['ライン']),
    click: colLetter_(colIndex['Click']),
    cv: colLetter_(colIndex['CV(720h)']),
    roas: colLetter_(colIndex['ROAS']),
    targetCpa: colLetter_(colIndex['目標CPA']),
    targetRoas: colLetter_(colIndex['目標ROAS']),
    judgment: colLetter_(colIndex['判定']),
    nextAction: colLetter_(colIndex['次アクション']),
  };
  var settingsRef = "'" + SHEET_NAMES.SETTINGS + "'";

  setFormulaIfEmpty_(
    sheet,
    2,
    colIndex['目標CPA'],
    '=ARRAYFORMULA(IF(' +
      col.product +
      '2:' +
      col.product +
      '="","",IFERROR(VLOOKUP(' +
      col.product +
      '2:' +
      col.product +
      '&"|"&IF(' +
      col.line +
      '2:' +
      col.line +
      '="","新規獲得ライン",' +
      col.line +
      '2:' +
      col.line +
      '),' +
      settingsRef +
      '!$A$10:$L$15,11,FALSE),"")))'
  );

  setFormulaIfEmpty_(
    sheet,
    2,
    colIndex['目標ROAS'],
    '=ARRAYFORMULA(IF(' +
      col.product +
      '2:' +
      col.product +
      '="","",IFERROR(VLOOKUP(' +
      col.product +
      '2:' +
      col.product +
      '&"|"&IF(' +
      col.line +
      '2:' +
      col.line +
      '="","新規獲得ライン",' +
      col.line +
      '2:' +
      col.line +
      '),' +
      settingsRef +
      '!$A$10:$L$15,12,FALSE),"")))'
  );

  // 判定: 4-3章の判定マトリクスをIFSで実装。上から順に評価される。
  var judgmentFormula =
    '=ARRAYFORMULA(IF(' +
    col.product +
    '2:' +
    col.product +
    '="","",IFS(' +
    '(' + col.estimatedCpc + '2:' + col.estimatedCpc + '<>"")*(' + col.targetCpa + '2:' + col.targetCpa + '<>"")*(' + col.estimatedCpc + '2:' + col.estimatedCpc + '>' + col.targetCpa + '2:' + col.targetCpa + '),"入札非推奨(単価が見合わない)",' +
    '(' + col.status + '2:' + col.status + '="入稿中")*(' + col.click + '2:' + col.click + '<' + settingsRef + '!$B$7),"データ蓄積中",' +
    '(' + col.status + '2:' + col.status + '="入稿中")*(' + col.click + '2:' + col.click + '>=' + settingsRef + '!$B$7)*(' + col.cv + '2:' + col.cv + '=0),"要改善(CV0)",' +
    '(' + col.status + '2:' + col.status + '="入稿中")*(' + col.roas + '2:' + col.roas + '<>"")*(' + col.roas + '2:' + col.roas + '>=' + col.targetRoas + '2:' + col.targetRoas + '),"好調・守る",' +
    '(' + col.status + '2:' + col.status + '="入稿中")*(' + col.roas + '2:' + col.roas + '<>""),"要改善",' +
    '(' + col.status + '2:' + col.status + '="非入稿")*((' + col.naturalRank + '2:' + col.naturalRank + '="")+ISNUMBER(SEARCH("圏外",' + col.naturalRank + '2:' + col.naturalRank + '))+((ISNUMBER(' + col.naturalRank + '2:' + col.naturalRank + '))*(' + col.naturalRank + '2:' + col.naturalRank + '>' + settingsRef + '!$B$5))),"攻める候補",' +
    '(' + col.status + '2:' + col.status + '="非入稿"),"守る(現状維持)",' +
    'TRUE,"要確認"' +
    ')))';
  setFormulaIfEmpty_(sheet, 2, colIndex['判定'], judgmentFormula);

  setFormulaIfEmpty_(
    sheet,
    2,
    colIndex['次アクション'],
    '=ARRAYFORMULA(IF(' +
      col.judgment +
      '2:' +
      col.judgment +
      '="","",IFERROR(VLOOKUP(' +
      col.judgment +
      '2:' +
      col.judgment +
      ',' +
      settingsRef +
      '!$A$18:$B$25,2,FALSE),"")))'
  );
}

function setFormulaIfEmpty_(sheet, row, col, formula) {
  var cell = sheet.getRange(row, col);
  if (cell.getFormula() === '' && cell.getValue() === '') {
    cell.setFormula(formula);
  }
}

/** 1-based column index -> A1形式の列文字(1=A, 2=B, ..., 27=AA)。 */
function colLetter_(colIndex) {
  var letter = '';
  var n = colIndex;
  while (n > 0) {
    var rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

if (typeof module !== 'undefined') {
  // Only the GAS-independent helper is exported for Node testing;
  // everything else here needs SpreadsheetApp/DriveApp and only runs in GAS.
  module.exports = { colLetter_: colLetter_ };
}
