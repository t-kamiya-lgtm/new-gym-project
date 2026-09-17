// Plain Node test (no framework) — run with: node test/pricingModel.test.js
var assert = require('assert');
var PricingModel = require('../src/PricingModel.js');

function approxEqual(actual, expected, tolerance, message) {
  tolerance = tolerance == null ? 1 : tolerance;
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    (message || '') + ' expected ~' + expected + ' got ' + actual
  );
}

// Values below are cross-checked against docs/rakuten-rpp-management-design.md section 10-4-1/10-4-2.

var monsterNew = PricingModel.getTargetForLine('Monster', 'new');
approxEqual(monsterNew.targetCpa, 1324, 1, 'Monster new-line target CPA');
approxEqual(monsterNew.targetRoasPct, 251, 1, 'Monster new-line target ROAS%');

var monsterStandard = PricingModel.getTargetForLine('Monster', 'standard');
approxEqual(monsterStandard.targetCpa, 2830, 1, 'Monster standard-line target CPA');
approxEqual(monsterStandard.targetRoasPct, 229, 1, 'Monster standard-line target ROAS%');

var monsterBulk = PricingModel.getTargetForLine('Monster', 'bulk');
approxEqual(monsterBulk.targetCpa, 4320, 1, 'Monster bulk-line target CPA');
approxEqual(monsterBulk.targetRoasPct, 219, 1, 'Monster bulk-line target ROAS%');

var sobaNew = PricingModel.getTargetForLine('Soba', 'new');
approxEqual(sobaNew.targetCpa, 1254, 1, 'Soba new-line target CPA');
approxEqual(sobaNew.targetRoasPct, 265, 1, 'Soba new-line target ROAS%');

var sobaStandard = PricingModel.getTargetForLine('Soba', 'standard');
approxEqual(sobaStandard.targetCpa, 2690, 1, 'Soba standard-line target CPA');

var sobaBulk = PricingModel.getTargetForLine('Soba', 'bulk');
approxEqual(sobaBulk.targetCpa, 4110, 1, 'Soba bulk-line target CPA');

// CPC vs CPA guard rail (design doc 10-5): "高たんぱく" 目安CPC 3,714円
assert.strictEqual(PricingModel.exceedsTargetCpa(3714, monsterNew.targetCpa), true);
assert.strictEqual(PricingModel.exceedsTargetCpa(3714, monsterBulk.targetCpa), false);

// missing inputs should not trigger the guard (treated as insufficient data elsewhere)
assert.strictEqual(PricingModel.exceedsTargetCpa(null, monsterNew.targetCpa), false);
assert.strictEqual(PricingModel.exceedsTargetCpa(100, null), false);

console.log('PricingModel tests passed.');
