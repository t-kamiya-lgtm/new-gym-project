/**
 * CSV helpers used by the RPP report importer and the other-promo-report importer.
 *
 * These are plain-JS (no GAS globals) so they can be unit tested under Node.
 * GAS's built-in Utilities.parseCsv() is not used because it does not reliably
 * handle the RMS export's mix of quoted fields; this hand-rolled RFC4180-ish
 * parser is deterministic and testable.
 */

/**
 * Parses CSV text into an array of rows (each row an array of string fields).
 * Handles quoted fields, embedded commas/newlines inside quotes, and "" escaped quotes.
 */
function parseCsvText(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;
  var i = 0;
  var len = text.length;

  while (i < len) {
    var c = text.charAt(i);

    if (inQuotes) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }

  // flush trailing field/row if the file doesn't end with a newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * RMS exports (RPP report, and likely other RMS report types) prefix the real
 * header row with several meta-info lines (実行日時, 検索条件, an operator
 * note, etc). Finds the row whose first cell matches `headerMarker` and
 * treats it as the header. Returns -1 if not found.
 */
function findHeaderRowIndex(rows, headerMarker) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === headerMarker) {
      return i;
    }
  }
  return -1;
}

/**
 * Converts parsed CSV rows into an array of plain objects keyed by the header
 * row found at `headerIndex`. Skips fully-empty rows.
 */
function rowsToObjects(rows, headerIndex) {
  var header = rows[headerIndex];
  var out = [];
  for (var i = headerIndex + 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r || r.length === 0 || (r.length === 1 && r[0] === '')) {
      continue;
    }
    var obj = {};
    for (var c = 0; c < header.length; c++) {
      obj[header[c]] = r[c] !== undefined ? r[c] : '';
    }
    out.push(obj);
  }
  return out;
}

/**
 * Parses the RPP CSV's "日付" column, e.g. "2026年09月01日～2026年09月16日",
 * into ISO start/end date strings. Returns nulls if the format doesn't match
 * (callers should fall back to leaving the period blank rather than throwing,
 * since this field is informational rather than a join key).
 */
function parsePeriodRangeJa(text) {
  if (!text) {
    return { start: null, end: null };
  }
  var m = text.match(
    /(\d{4})年(\d{1,2})月(\d{1,2})日\s*[〜～~-]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/
  );
  if (!m) {
    return { start: null, end: null };
  }
  var pad = function (n) {
    return n.length === 1 ? '0' + n : n;
  };
  var start = m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  var end = m[4] + '-' + pad(m[5]) + '-' + pad(m[6]);
  return { start: start, end: end };
}

/**
 * Fallback header-row detector for RMS-style exports whose exact preamble
 * format we haven't confirmed yet (used by the other-promo-report importer;
 * see docs/rakuten-rpp-management-design.md section 12). Returns the index
 * of the first row that has at least `minNonEmptyFields` non-empty cells,
 * which in practice skips single-cell meta-info lines and lands on the real
 * header. Returns -1 if no such row exists.
 */
function guessTabularHeaderRowIndex(rows, minNonEmptyFields) {
  var threshold = minNonEmptyFields == null ? 3 : minNonEmptyFields;
  for (var i = 0; i < rows.length; i++) {
    var nonEmpty = (rows[i] || []).filter(function (cell) {
      return cell !== '';
    }).length;
    if (nonEmpty >= threshold) {
      return i;
    }
  }
  return -1;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseCsvText: parseCsvText,
    findHeaderRowIndex: findHeaderRowIndex,
    rowsToObjects: rowsToObjects,
    parsePeriodRangeJa: parsePeriodRangeJa,
    guessTabularHeaderRowIndex: guessTabularHeaderRowIndex,
  };
}
