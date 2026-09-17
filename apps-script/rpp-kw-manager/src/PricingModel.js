/**
 * Incremental-profit-based target CPA / ROAS model.
 * Mirrors docs/rakuten-rpp-management-design.md section 10 exactly —
 * if the numbers in that doc change, update them here too.
 *
 * Confirmed business rule (2026-09-17): target overall-sales ROAS/CPA is set
 * so that ~10% incremental profit margin remains AFTER ad spend (not a flat
 * "keep X% of the margin" coefficient). This clusters into 3 practical lines
 * per product (new-acquisition / standard / bulk) matched to likely basket size.
 */

var SELLING_FEE_RATE = 0.15;
var PAYMENT_FEE_RATE = 0.02;
var DEFAULT_TARGET_MARGIN_RATE = 0.10;

var UNIT_COST_PER_10_SERVINGS = {
  Monster: 700,
  Soba: 770,
};

// RMS商品SKU登録画面で確認した確定価格・SKU管理番号(設計書10-4)。
var SKU_PRICE_TABLE = {
  Monster: {
    3: { sku: 'PM030', price: 1200 },
    10: { sku: 'PM100', price: 3320 },
    20: { sku: 'PM200', price: 6480 },
    30: { sku: 'PM300', price: 9480 },
    50: { sku: 'PM500', price: 12980 },
  },
  Soba: {
    3: { sku: 'PM402', price: 1200 },
    10: { sku: 'PM403', price: 3320 },
    20: { sku: 'PM404', price: 6480 },
    30: { sku: 'PM405', price: 9480 },
  },
};

// KWの購入意図に応じた3ライン(設計書10-4-1)。judgment側のデフォルトは 'new'。
var PURCHASE_LINES = {
  new: { label: '新規獲得ライン', servings: 10 },
  standard: { label: '標準ライン', servings: 20 },
  bulk: { label: '大容量ライン', servings: 30 },
};

function variableCost(product, servings) {
  var unitCost10 = UNIT_COST_PER_10_SERVINGS[product];
  if (!unitCost10) {
    throw new Error('Unknown product: ' + product);
  }
  var cost = (unitCost10 * servings) / 10;
  var shipping = servings < 20 ? 400 : 500;
  return cost + shipping;
}

/** 増し分利益(受注1件, 広告費を引く前)。設計書10-2。 */
function incrementalProfit(product, servings, price) {
  var netRate = 1 - SELLING_FEE_RATE - PAYMENT_FEE_RATE;
  return price * netRate - variableCost(product, servings);
}

/**
 * 目標CPA・目標ROASを算出する。
 * 目標CPA = 増し分利益 − 目標増し分利益率 × 売上
 * 目標ROAS = 1 ÷ (増し分利益率 − 目標増し分利益率)
 */
function computeTarget(product, servings, price, targetMarginRate) {
  var margin = targetMarginRate == null ? DEFAULT_TARGET_MARGIN_RATE : targetMarginRate;
  var profit = incrementalProfit(product, servings, price);
  var profitRate = profit / price;
  var targetCpa = profit - margin * price;
  var denom = profitRate - margin;
  var targetRoasPct = denom > 0 ? (1 / denom) * 100 : null; // null = 目標margin到達不可(理論上ペイしない価格帯)
  return {
    product: product,
    servings: servings,
    price: price,
    incrementalProfit: profit,
    incrementalProfitRate: profitRate,
    targetCpa: targetCpa,
    targetRoasPct: targetRoasPct,
  };
}

/** 商品×ラインで目標CPA/ROASを引く(設定シートの目標CPAマトリクスに相当)。 */
function getTargetForLine(product, lineKey, targetMarginRate) {
  var line = PURCHASE_LINES[lineKey];
  if (!line) {
    throw new Error('Unknown purchase line: ' + lineKey);
  }
  var sku = SKU_PRICE_TABLE[product] && SKU_PRICE_TABLE[product][line.servings];
  if (!sku) {
    throw new Error('No SKU price for ' + product + ' / ' + line.servings + '食');
  }
  var target = computeTarget(product, line.servings, sku.price, targetMarginRate);
  target.line = lineKey;
  target.lineLabel = line.label;
  target.sku = sku.sku;
  return target;
}

/**
 * 10-5の足切りルール: 目安CPC(またはKW単位の現CPC)が目標CPAを上回るかを判定する。
 * true を返す場合は「入札非推奨」。
 */
function exceedsTargetCpa(estimatedCpc, targetCpa) {
  if (estimatedCpc == null || targetCpa == null) {
    return false; // 判定に必要な値が無ければ足切りしない(データ不足として別ルートで扱う)
  }
  return estimatedCpc > targetCpa;
}

if (typeof module !== 'undefined') {
  module.exports = {
    SELLING_FEE_RATE: SELLING_FEE_RATE,
    PAYMENT_FEE_RATE: PAYMENT_FEE_RATE,
    DEFAULT_TARGET_MARGIN_RATE: DEFAULT_TARGET_MARGIN_RATE,
    UNIT_COST_PER_10_SERVINGS: UNIT_COST_PER_10_SERVINGS,
    SKU_PRICE_TABLE: SKU_PRICE_TABLE,
    PURCHASE_LINES: PURCHASE_LINES,
    variableCost: variableCost,
    incrementalProfit: incrementalProfit,
    computeTarget: computeTarget,
    getTargetForLine: getTargetForLine,
    exceedsTargetCpa: exceedsTargetCpa,
  };
}
