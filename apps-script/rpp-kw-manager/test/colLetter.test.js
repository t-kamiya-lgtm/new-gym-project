// Plain Node test (no framework) — run with: node test/colLetter.test.js
var assert = require('assert');
var SetupSpreadsheet = require('../src/SetupSpreadsheet.js');

var cases = [
  [1, 'A'],
  [2, 'B'],
  [26, 'Z'],
  [27, 'AA'],
  [28, 'AB'],
  [30, 'AD'], // KW_MASTER_COLUMNS has exactly 30 columns — this is its last one
  [52, 'AZ'],
  [53, 'BA'],
];

cases.forEach(function (c) {
  var actual = SetupSpreadsheet.colLetter_(c[0]);
  assert.strictEqual(actual, c[1], 'colLetter_(' + c[0] + ') expected ' + c[1] + ' got ' + actual);
});

console.log('colLetter_ tests passed.');
