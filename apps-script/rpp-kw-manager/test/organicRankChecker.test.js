// Plain Node test (no framework) — run with: node test/organicRankChecker.test.js
var assert = require('assert');
var Constants = require('../src/Constants.js');
var OrganicRankChecker = require('../src/OrganicRankChecker.js');

// Real response captured from the Rakuten API test form on 2026-09-17 for
// keyword="プロテインモンスター". itemCode was "florahouse:10000165" (an
// opaque internal ID we can't know in advance), which is why matching must
// go through itemUrl instead — this pins that behavior down.
var sobaItemUrl = 'https://item.rakuten.co.jp/florahouse/pm_sova/?rafcid=wsc_i_is_84f18fc7-bfa3-40d3-9289-1b886ce22df2';

assert.strictEqual(
  OrganicRankChecker.itemUrlMatches_(sobaItemUrl, Constants.PRODUCT_ITEM_URL_PATH.Soba),
  true,
  'Soba url path should match the real Soba itemUrl'
);
assert.strictEqual(
  OrganicRankChecker.itemUrlMatches_(sobaItemUrl, Constants.PRODUCT_ITEM_URL_PATH.Monster),
  false,
  'Monster url path must NOT match the Soba itemUrl (they share the "pm" prefix)'
);

var monsterItemUrl = 'https://item.rakuten.co.jp/florahouse/pm/?rafcid=wsc_i_is_xxxx';
assert.strictEqual(
  OrganicRankChecker.itemUrlMatches_(monsterItemUrl, Constants.PRODUCT_ITEM_URL_PATH.Monster),
  true,
  'Monster url path should match the real Monster itemUrl'
);
assert.strictEqual(
  OrganicRankChecker.itemUrlMatches_(monsterItemUrl, Constants.PRODUCT_ITEM_URL_PATH.Soba),
  false,
  'Soba url path must NOT match the Monster itemUrl'
);

assert.strictEqual(OrganicRankChecker.itemUrlMatches_(undefined, Constants.PRODUCT_ITEM_URL_PATH.Monster), false);
assert.strictEqual(OrganicRankChecker.itemUrlMatches_('', Constants.PRODUCT_ITEM_URL_PATH.Monster), false);

console.log('OrganicRankChecker tests passed.');
