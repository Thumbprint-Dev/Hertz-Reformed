/**
 * "Choose your uniform" — the picker.
 *
 * This replaced a read-only summary table. The table was a stop on the way to nowhere: it
 * told an employee what they had and then made them navigate somewhere else to act on it.
 * Every number here comes from the API; nothing is computed locally and nothing is
 * hardcoded, which is the whole point — `categoryCtrl.js` still decides allocations in
 * JavaScript (`ssQuantity = 2`, `3` if full-time, `4` if LAX), and this is what replaces it.
 */
four51.app.controller('AllocationCtrl', ['$scope', 'Allocation',
  function($scope, Allocation) {

    // Bound to an object, never bare primitives: anything under an `ng-if` gets a child
    // scope, and writing to a bare name there shadows rather than updates.
    $scope.alloc = {
      enabled: Allocation.isEnabled(),
      loading: false,
      error: null,
      eligibility: null,
      view: null,
      brandKey: 'hertz',
      pools: [],
      closed: [],
      /** sku -> { qty, size } */
      picked: {},
      totalPicked: 0,
      preview: null,
      submitting: false,
      result: null
    };

    var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    $scope.alloc.sizes = SIZES;

    /**
     * Schematic garment outlines, keyed by category.
     *
     * Not photography — Four51 holds the product imagery and we have no URL for it in
     * `catalog_map`. A grey box reads as "image missing"; an outline reads as "this is
     * where the photo goes" and lets the row be judged at its real proportions.
     */
    var ART = {
      'Short Sleeve Polo': 'polo', 'Long Sleeve Polo': 'poloLs',
      'Pants': 'pants', 'Shorts': 'shorts', 'Skirt': 'skirt',
      'Quarter Zip': 'layer', 'Fleece': 'layer', 'Softshell': 'layer', 'Jacket': 'layer',
      'Hat': 'cap', 'Beanie': 'beanie', 'Belt': 'belt', 'Parka': 'layer'
    };

    /** Which measurements a size chart shows, by category. */
    var CHART = {
      'Short Sleeve Polo': 'top', 'Long Sleeve Polo': 'topLs',
      'Quarter Zip': 'topLs', 'Fleece': 'topLs', 'Softshell': 'topLs', 'Jacket': 'topLs',
      'Parka': 'topLs',
      'Pants': 'bottom', 'Shorts': 'short', 'Skirt': 'skirt',
      'Hat': 'head', 'Beanie': 'head', 'Belt': 'belt'
    };

    /**
     * A readable name for a product, derived from its InteropID.
     *
     * A STOPGAP. `catalog_map` stores the Four51 product id and SKU but no display name,
     * so this reads the gender segment out of the id — `-M-` men's, `-W-` women's,
     * `-US-`/`-UV` unisex — and pairs it with the category. When Four51 product names are
     * available they should be used instead and this should go; deriving a label from an
     * identifier is the kind of thing that quietly mislabels a garment after a SKU change.
     */
    function labelFor(productId, categoryName) {
      var id = (productId || '').toUpperCase();
      if (/-M-/.test(id)) return categoryName + " — men's";
      if (/-W-/.test(id)) return categoryName + " — women's";
      return categoryName;
    }

    function describe(err) {
      if (!err) return 'Could not load your allocation.';
      if (err.noSession) return 'Please sign in to choose your uniform.';
      if (err.network || err.status === 0) return 'Could not reach the allocation service.';
      if (err.status === 403) return 'The allocation service refused this request.';
      if (err.status === 401) return 'Your session could not be verified.';
      return 'Could not load your allocation.';
    }

    function brandKeyFor(brand) {
      if (!brand) return 'hertz';
      var b = brand.toLowerCase();
      if (b.indexOf('dollar') > -1) return 'dollar';
      if (b.indexOf('thrifty') > -1) return 'thrifty';
      return 'hertz';
    }

    /** Units chosen from one pool, across every category and product inside it. */
    $scope.alloc.usedIn = function(pool) {
      var n = 0;
      angular.forEach(pool.categories || [], function(c) {
        angular.forEach(c.products || [], function(p) {
          var row = $scope.alloc.picked[p.productId];
          if (row) n += row.qty;
        });
      });
      return n;
    };

    $scope.alloc.leftIn = function(pool) {
      return pool.remaining - $scope.alloc.usedIn(pool);
    };

    /**
     * May one more be taken?
     *
     * The pool total is the only ceiling (decision 13, reversed and client-confirmed:
     * five Tops means five, in any mix). The server enforces this too — this is the
     * courtesy of not offering something that would be refused, never the control.
     */
    $scope.alloc.canAdd = function(pool) {
      return $scope.alloc.leftIn(pool) > 0;
    };

    $scope.alloc.qtyOf = function(productId) {
      var row = $scope.alloc.picked[productId];
      return row ? row.qty : 0;
    };

    $scope.alloc.sizeOf = function(productId) {
      var row = $scope.alloc.picked[productId];
      return row ? row.size : 'L';
    };

    $scope.alloc.setSize = function(productId, size) {
      var row = $scope.alloc.picked[productId];
      if (row) row.size = size;
      else $scope.alloc.picked[productId] = { qty: 0, size: size };
    };

    function retotal() {
      var n = 0;
      angular.forEach($scope.alloc.picked, function(row) { n += row.qty; });
      $scope.alloc.totalPicked = n;
      $scope.alloc.result = null;
    }

    $scope.alloc.add = function(pool, product) {
      if (!$scope.alloc.canAdd(pool)) return;
      var row = $scope.alloc.picked[product.productId];
      if (row) row.qty += 1;
      else $scope.alloc.picked[product.productId] = { qty: 1, size: 'L' };
      retotal();
    };

    $scope.alloc.remove = function(product) {
      var row = $scope.alloc.picked[product.productId];
      if (!row) return;
      row.qty = Math.max(0, row.qty - 1);
      if (row.qty === 0) delete $scope.alloc.picked[product.productId];
      retotal();
    };

    $scope.alloc.toggle = function(pool) {
      // One open at a time: the whole list expanded is a wall of rows with no shape.
      var wasOpen = pool.open;
      angular.forEach($scope.alloc.pools, function(p) { p.open = false; });
      pool.open = !wasOpen;
    };

    $scope.alloc.openPreview = function(pool, category, product) {
      $scope.alloc.preview = {
        pool: pool,
        category: category,
        product: product,
        name: labelFor(product.productId, category.name),
        art: ART[category.name] || 'polo',
        chart: CHART[category.name] || 'top'
      };
    };
    $scope.alloc.closePreview = function() { $scope.alloc.preview = null; };

    /**
     * Size chart rows, in inches.
     *
     * EXAMPLE measurements, labelled as such in the UI. Hertz supplies the real chart;
     * these exist so the table can be laid out and judged and must not be mistaken for a
     * garment's actual spec. Different measurements per garment type on purpose — a
     * single generic table would look fine and be wrong.
     */
    var CHARTS = {
      top:    { rows: ['Chest', 'Body length', 'Sleeve'],
                vals: { XS:[34,27,8], S:[36,28,8.5], M:[40,29,9], L:[44,30,9.5],
                        XL:[48,31,10], '2XL':[52,32,10.5], '3XL':[56,33,11] } },
      topLs:  { rows: ['Chest', 'Body length', 'Sleeve'],
                vals: { XS:[34,27,32], S:[36,28,32.5], M:[40,29,33], L:[44,30,33.5],
                        XL:[48,31,34], '2XL':[52,32,34.5], '3XL':[56,33,35] } },
      bottom: { rows: ['Waist', 'Inseam', 'Hip'],
                vals: { XS:[28,30,36], S:[30,30,38], M:[34,32,42], L:[38,32,46],
                        XL:[42,32,50], '2XL':[46,32,54], '3XL':[50,32,58] } },
      short:  { rows: ['Waist', 'Inseam', 'Hip'],
                vals: { XS:[28,9,36], S:[30,9,38], M:[34,9,42], L:[38,10,46],
                        XL:[42,10,50], '2XL':[46,10,54], '3XL':[50,10,58] } },
      skirt:  { rows: ['Waist', 'Length', 'Hip'],
                vals: { XS:[28,22,36], S:[30,22,38], M:[34,23,42], L:[38,23,46],
                        XL:[42,23,50], '2XL':[46,24,54], '3XL':[50,24,58] } },
      head:   { rows: ['Head circumference'],
                vals: { XS:[21], S:[21.5], M:[22], L:[22.5], XL:[23], '2XL':[23.5], '3XL':[24] } },
      belt:   { rows: ['Length'],
                vals: { XS:[32], S:[34], M:[38], L:[42], XL:[46], '2XL':[50], '3XL':[54] } }
    };

    $scope.alloc.chartRows = function(key) {
      var spec = CHARTS[key] || CHARTS.top;
      var out = [];
      for (var i = 0; i < spec.rows.length; i++) {
        var values = [];
        for (var j = 0; j < SIZES.length; j++) {
          var v = spec.vals[SIZES[j]];
          values.push(v ? v[i] : '\u2014');
        }
        out.push({ label: spec.rows[i], values: values });
      }
      return out;
    };

    $scope.alloc.labelFor = labelFor;
    $scope.alloc.artFor = function(categoryName) { return ART[categoryName] || 'polo'; };

    /**
     * Ask the gatekeeper whether this selection is allowed.
     *
     * The server is the control, not the steppers above: the storefront caches its
     * category tree in `localStorage` with no expiry, and `PUT order/repeat/:id` clones a
     * past order with no client code running at all. Both reach checkout without any of
     * this UI being involved.
     */
    $scope.alloc.check = function() {
      if (!$scope.alloc.totalPicked) return;
      $scope.alloc.submitting = true;
      $scope.alloc.result = null;

      var lines = [];
      var i = 0;
      angular.forEach($scope.alloc.picked, function(row, productId) {
        i++;
        lines.push({
          four51LineId: 'pick-' + i,
          four51ProductId: productId,
          quantity: row.qty
        });
      });

      Allocation.validateCart('picker-' + Date.now(), lines)
        .then(function() {
          $scope.alloc.result = { ok: true, messages: ['Your selection fits your allocation.'] };
          $scope.alloc.submitting = false;
        })
        .catch(function(err) {
          // A 409 body is a Four51-shaped refusal. Read Message and Errors only — never
          // LineItems[].Errors, which the storefront rewrites to "out of stock".
          var messages = (err && err.status === 409)
            ? Allocation.refusalText(err.body)
            : [describe(err)];
          $scope.alloc.result = { ok: false, messages: messages };
          $scope.alloc.submitting = false;
        });
    };

    $scope.alloc.load = function() {
      if (!$scope.alloc.enabled) return;
      $scope.alloc.loading = true;
      $scope.alloc.error = null;

      Allocation.eligibility()
        .then(function(eligibility) {
          $scope.alloc.eligibility = eligibility;
          if (eligibility && eligibility.status !== 'eligible') return null;
          return Allocation.entitlement();
        })
        .then(function(view) {
          if (view) {
            $scope.alloc.view = view;
            $scope.alloc.brandKey = brandKeyFor(view.brand);
            $scope.alloc.closed = view.seasonalClosed || [];
            $scope.alloc.pools = view.pools || [];
            // Open the largest pool: the page should show what it does at rest rather
            // than a column of closed rows.
            var biggest = null;
            angular.forEach($scope.alloc.pools, function(p) {
              if (!biggest || p.remaining > biggest.remaining) biggest = p;
            });
            if (biggest) biggest.open = true;
          }
          $scope.alloc.loading = false;
        })
        .catch(function(err) {
          $scope.alloc.error = describe(err);
          $scope.alloc.loading = false;
        });
    };

    $scope.alloc.load();
  }]);
