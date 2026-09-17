/**
 * Checks organic (natural search) rank for every KW in RPP_KW管理表 —
 * regardless of 運用ステータス, per design doc section 4-2 — using the
 * Rakuten Ichiba Item Search API (公式, no scraping). Results are approximate
 * (the API's "standard" sort doesn't exactly match the on-page ranking with
 * personalization/ads), so they're used as a trend indicator, not ground truth.
 *
 * Handles GAS's 6-minute execution limit by checkpointing progress in
 * PropertiesService and resuming on the next trigger firing if needed.
 */

var RAKUTEN_ITEM_SEARCH_ENDPOINT =
  'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';
var MAX_PAGES = 5; // 5 pages x 30 hits = top 150 (設計書4-2)
var HITS_PER_PAGE = 30;
var RATE_LIMIT_SLEEP_MS = 1100; // 楽天APIのレート制限(概ね1req/秒)に余裕を見た値
var MAX_RUNTIME_MS = 5 * 60 * 1000; // GASの6分上限に対し1分のバッファを残す
var PROGRESS_KEY = 'ORGANIC_RANK_CHECK_PROGRESS';

/** Entry point for the Mon/Thu trigger and the spreadsheet menu. */
function checkOrganicRanks() {
  var config = requireConfig_(['RAKUTEN_APP_ID', 'SPREADSHEET_ID']);
  var spreadsheet = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  var kwSheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.KW_MASTER);
  var rankLogSheet = getSheetOrThrow_(spreadsheet, SHEET_NAMES.RANK_LOG);

  var colIndex = getHeaderIndexMap_(kwSheet);
  var lastRow = kwSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('KW管理表にデータがありません。');
    return;
  }
  var values = kwSheet
    .getRange(2, 1, lastRow - 1, kwSheet.getLastColumn())
    .getValues();

  var startIndex = Number(
    PropertiesService.getScriptProperties().getProperty(PROGRESS_KEY) || 0
  );
  var startTime = Date.now();
  var checked = 0;
  var i;

  for (i = startIndex; i < values.length; i++) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      break; // out of time this run; resume from here next time
    }
    var row = values[i];
    var product = row[colIndex['商品'] - 1];
    var kw = row[colIndex['KW'] - 1];
    if (!product || !kw) continue;

    var itemCode = PRODUCT_RAKUTEN_ITEM_CODE[product];
    if (!itemCode) {
      Logger.log('商品「' + product + '」に対応するitemCodeが未設定のためスキップ: ' + kw);
      continue;
    }

    var rank = null;
    try {
      rank = findOrganicRank_(kw, itemCode, config.RAKUTEN_APP_ID);
    } catch (e) {
      Logger.log('自然検索順位チェック失敗 (' + product + ' / ' + kw + '): ' + e.message);
      continue;
    }

    var today = new Date();
    var rowNumber = i + 2;
    writeRowFields_(kwSheet, rowNumber, colIndex, {
      自然検索順位: rank === null ? '圏外(' + MAX_PAGES * HITS_PER_PAGE + '+)' : rank,
      自然検索順位_取得日: today,
    });
    rankLogSheet.appendRow([today, product, kw, '', '', rank === null ? '' : rank]);
    checked++;
  }

  if (i >= values.length) {
    PropertiesService.getScriptProperties().deleteProperty(PROGRESS_KEY);
    Logger.log('自然検索順位チェック完了: 全' + values.length + '件、今回' + checked + '件処理');
  } else {
    PropertiesService.getScriptProperties().setProperty(PROGRESS_KEY, String(i));
    Logger.log(
      '実行時間上限のため中断: ' +
        checked +
        '件処理、' +
        i +
        '/' +
        values.length +
        '件目から次回再開します(次のMon/Thuトリガーで自動再開)'
    );
  }
}

/**
 * Searches up to MAX_PAGES pages of HITS_PER_PAGE results for `keyword` and
 * returns the 1-based overall rank of `itemCode`, or null if not found within
 * the searched range (treated as 圏外).
 */
function findOrganicRank_(keyword, itemCode, appId) {
  for (var page = 1; page <= MAX_PAGES; page++) {
    var url =
      RAKUTEN_ITEM_SEARCH_ENDPOINT +
      '?format=json' +
      '&keyword=' + encodeURIComponent(keyword) +
      '&applicationId=' + encodeURIComponent(appId) +
      '&hits=' + HITS_PER_PAGE +
      '&page=' + page +
      '&sort=standard';

    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = response.getResponseCode();
    if (code !== 200) {
      throw new Error('楽天API応答エラー (HTTP ' + code + '): ' + response.getContentText());
    }
    var json = JSON.parse(response.getContentText());
    var items = json.Items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i].Item;
      if (item && item.itemCode === itemCode) {
        return (page - 1) * HITS_PER_PAGE + i + 1;
      }
    }
    if (items.length < HITS_PER_PAGE) {
      break; // fewer results than a full page means we've reached the end
    }
    Utilities.sleep(RATE_LIMIT_SLEEP_MS);
  }
  return null;
}
