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
four51.app.filter('hzPool', function() {
  // "Seasonal Outerwear" sits beside its own reopening date wherever it appears, so the
  // word "Seasonal" restates what the date already says and costs a narrow cell a line.
  var LABELS = { 'Polos': 'Tops', 'Seasonal Outerwear': 'Outerwear' };
  return function(value) {
    return LABELS[value] || value;
  };
});
