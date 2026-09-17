/**
 * Installs the Mon/Thu time-driven triggers (design doc section 7).
 * Run `installTriggers` once from the Apps Script editor or the custom menu.
 * Safe to re-run: it removes any triggers this project previously created
 * for the same handler before recreating them, so it never double-fires.
 */

var MANAGED_TRIGGER_HANDLERS = ['runMonThuJobs'];

function installTriggers() {
  removeManagedTriggers_();

  [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.THURSDAY].forEach(function (day) {
    ScriptApp.newTrigger('runMonThuJobs')
      .timeBased()
      .onWeekDay(day)
      .atHour(6)
      .create();
  });

  Logger.log('月・木 朝6時台のトリガーを設置しました。');
}

function removeManagedTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (MANAGED_TRIGGER_HANDLERS.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * The single function both weekly triggers call. Order matters: import RPP
 * performance and other-promo data first, then check organic rank (so the
 * judgment formulas in RPP_KW管理表 see fresh data on the same run).
 */
function runMonThuJobs() {
  var results = { rpp: null, otherPromo: null, organicRank: null, errors: [] };

  try {
    results.rpp = importRppReports();
  } catch (e) {
    results.errors.push('RPPレポート取込: ' + e.message);
  }

  try {
    results.otherPromo = importOtherPromoReports();
  } catch (e) {
    results.errors.push('他施策レポート取込: ' + e.message);
  }

  try {
    results.organicRank = checkOrganicRanks();
  } catch (e) {
    results.errors.push('自然検索順位チェック: ' + e.message);
  }

  if (results.errors.length > 0) {
    Logger.log('runMonThuJobs で発生したエラー:\n' + results.errors.join('\n'));
  }
  return results;
}
