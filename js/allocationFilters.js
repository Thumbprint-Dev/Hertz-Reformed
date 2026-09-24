/**
 * Date formatting for the allocation page.
 *
 * ## Why not Angular's built-in `date` filter
 *
 * The API returns calendar dates as `YYYY-MM-DD` — a *day*, not an instant. Angular's
 * `date` filter hands a bare string to the Date constructor, and `new Date('2026-10-01')`
 * is parsed as **UTC midnight**. Rendered anywhere west of Greenwich that is the evening
 * of 30 September, so "Available from 1 October" silently becomes "Available from
 * 30 September" for every user in the United States.
 *
 * That is the same class of error as migration 0004, where a `CURRENT_DATE` default was
 * evaluated in UTC and hid the entire catalogue for five hours every night. The whole
 * system computes dates in America/New_York on purpose; undoing that in the last step
 * before it reaches a human would be a poor joke.
 *
 * So the string is split on its own terms and never converted to an instant at all.
 */
four51.app.filter('hzDate', function() {
  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return function(value, withYear) {
    if (!value || typeof value !== 'string') return value;
    var parts = value.split('-');
    if (parts.length < 3) return value;

    var year = parts[0];
    var month = MONTHS[parseInt(parts[1], 10) - 1];
    var day = parseInt(parts[2], 10);
    if (!month || !day) return value;

    // Month day, year: "February 26, 2026". US order, because every reader of this
    // storefront is a US employee. It was "26 February 2026" until 21 September 2026,
    // which is the British order and read as a typo to the client.
    //
    // "October 1" rather than "October 1, 2026" for a date inside the next twelve
    // months, which every seasonal reopening is. The year is asked for explicitly where
    // it genuinely matters, like a hire date or the end of an allocation year.
    return withYear === false ? month + ' ' + day : month + ' ' + day + ', ' + year;
  };
});

/**
 * Display name for an allocation pool.
 *
 * The database calls it "Polos" and so do the ledger, the reports and eventually Zoho.
 * Employees call them tops, and Hertz asked for that word on screen. Mapping here rather
 * than renaming the pool keeps one name in the data and one in the interface, so a report
 * and a screen can never disagree about what was ordered.
 */
/**
 * A readable garment name from a product id and its category: "Men's Pants".
 *
 * A STOPGAP, and one copy of it. `catalog_map` stores the Four51 product id but no display
 * name, so this reads the gender segment out of the id — `-M-` men's, `-W-` women's,
 * anything else unisex — and pairs it with the category. The picker and the return form
 * both use it, so a garment is called the same thing when it is chosen and when it is sent
 * back. When Four51 product names are available they should replace this: deriving a label
 * from an identifier is the kind of thing that quietly mislabels a garment after a SKU
 * change.
 */
four51.app.filter('hzGarment', function() {
  return function(productId, categoryName) {
    var id = (productId || '').toUpperCase();
    var name = categoryName || productId || '';
    // "Men's Pants", not "Pants — men's": no em dashes in anything an employee reads.
    if (/-M-/.test(id)) return "Men's " + name;
    if (/-W-/.test(id)) return "Women's " + name;
    return name;
  };
});

four51.app.filter('hzPool', function() {
  // "Seasonal Outerwear" sits beside its own reopening date wherever it appears, so the
  // word "Seasonal" restates what the date already says and costs a narrow cell a line.
  var LABELS = { 'Polos': 'Tops', 'Seasonal Outerwear': 'Outerwear' };
  return function(value) {
    return LABELS[value] || value;
  };
});

/**
 * The day an allocation year rolls over, from the day it ends.
 *
 * `cycleEnd` is the LAST day of the cycle, so the reset is the day after it. Showing the
 * end date under a label saying "resets" would be off by one, and a Uniform Champion
 * planning around it would tell someone the wrong week.
 *
 * Arithmetic in UTC on the date parts, never `new Date(string)` plus local getters:
 * `2027-05-27` parses as UTC midnight, and reading it back with local getters west of
 * Greenwich returns the 26th. Same class of bug as the feed generator's, which put CI in
 * the wrong day for four hours a night (CLAUDE.md invariant 7).
 */
four51.app.filter('hzResetDate', ['hzDateFilter', function(hzDateFilter) {
  return function(value) {
    if (!value || typeof value !== 'string') return value;
    var parts = value.split('-');
    if (parts.length < 3) return value;

    var next = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2] + 1));
    if (isNaN(next.getTime())) return value;

    var iso = next.getUTCFullYear() + '-' +
              ('0' + (next.getUTCMonth() + 1)).slice(-2) + '-' +
              ('0' + next.getUTCDate()).slice(-2);
    return hzDateFilter(iso);
  };
}]);

/**
 * Reading a Four51 InteropID back into its parts: garment, brand, size.
 *
 * `HTZ-POLOLS-M-HZ-L`, `HTZ-CARGOPANT-M-UV-28x34`, `HTZ-RFHAT-HZ`,
 * `HTZ-PERFPANT-M-UV-32x30-CIN`. The brand segment (HZ, DT, UV, THFT) is the pivot: what
 * comes before it is the garment, what comes after it is the size, and a trailing `-CIN`
 * marks Cintas stock sold ahead of the Thumbprint item (decision 54), which is the same
 * garment. A base id with nothing after the brand is one size.
 */
four51.app.factory('hzSkuParts', function() {
  var BRANDS = ['HZ', 'DT', 'UV', 'THFT'];
  return function(id) {
    var parts = String(id || '').toUpperCase().replace(/-CIN$/, '').split('-');
    if (parts[0] === 'HTZ') parts.shift();
    var at = -1;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (BRANDS.indexOf(parts[i]) > -1) { at = i; break; }
    }
    if (at < 0) return { stem: parts.join('-').toLowerCase(), size: null };
    var size = parts.slice(at + 1).join('-');
    return {
      stem: parts.slice(0, at).join('-').toLowerCase(),
      // Sizes are written as Four51 has them: 28x34, not 28X34.
      size: size ? size.replace(/(\d)X(\d)/, '$1x$2') : null
    };
  };
});

/**
 * The product photo for an InteropID, sized or not, or null for the outline.
 *
 * DEMO ASSETS: the vendor renderings Hertz supplied, until Four51 serves its own imagery.
 * Listed rather than probed, because a browser cannot ask whether a file exists without
 * requesting it, and an unlisted stem would show a broken image. `rfblt` (belt) has none.
 */
four51.app.filter('hzPhoto', ['hzSkuParts', function(hzSkuParts) {
  var PHOTOS = [
    'beanie', 'cargopant-m', 'cargopant-w', 'cargoshort-m', 'cargoshort-w',
    'flzip-w', 'lskirt-w', 'matpant-w', 'mattop', 'parka-us', 'perfpant-m',
    'perfpant-w', 'polols-m', 'polols-w', 'poloss-m', 'poloss-w', 'qtzip-m',
    'rfhat', 'sshell-us'
  ];
  return function(id) {
    var stem = hzSkuParts(id).stem;
    return PHOTOS.indexOf(stem) === -1 ? null : 'css/img/products/' + stem + '.png';
  };
}]);

/** The size in an InteropID ("L", "28x34"), or null for a one-size item. */
four51.app.filter('hzSize', ['hzSkuParts', function(hzSkuParts) {
  return function(id) { return hzSkuParts(id).size; };
}]);

/** Garments in a list of Four51 line items: five polos on one line are five. */
four51.app.filter('hzUnits', function() {
  return function(lineItems) {
    var n = 0;
    angular.forEach(lineItems || [], function(li) { n += (li && li.Quantity) || 0; });
    return n;
  };
});
