/**
 * "Choose your uniform" — the picker.
 *
 * This replaced a read-only summary table. The table was a stop on the way to nowhere: it
 * told an employee what they had and then made them navigate somewhere else to act on it.
 * Every number here comes from the API; nothing is computed locally and nothing is
 * hardcoded, which is the whole point — `categoryCtrl.js` still decides allocations in
 * JavaScript (`ssQuantity = 2`, `3` if full-time, `4` if LAX), and this is what replaces it.
 */
four51.app.controller('AllocationCtrl', ['$scope', '$rootScope', '$location', '$q', 'Allocation', 'Order', 'Product',
  function($scope, $rootScope, $location, $q, Allocation, Order, Product) {

    /**
     * Whose allocation this page is spending.
     *
     * `?for=<employeeId>` means a Champion arrived from the team picker. It is read from
     * the URL rather than held in a service so a reload, a bookmark or a second tab
     * cannot quietly revert to the Champion's own allocation — that version of the bug
     * spends the wrong person's year and looks like nothing happened.
     *
     * Empty for an ordinary employee, and every call below then behaves exactly as it did
     * before. The server authorises the id on every request regardless; this only decides
     * what to ask for.
     */
    var FOR = ($location.search() || {}).for || null;

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
      result: null,
      /** True when a Champion is ordering for someone else. */
      onBehalf: false,
      beneficiaryId: null
    };

    /** Back to the team picker, dropping the beneficiary. */
    $scope.alloc.leaveOnBehalf = function() {
      $location.path('/champion').search({});
    };

    /**
     * The draft order id.
     *
     * The picker calls `previewCart`, which holds nothing — so this id no longer decides
     * whether units are reserved. It still matters for what the preview *compares
     * against*: the API measures a selection against what this id already holds, so a
     * stable id means the preview is judged against this employee's own draft rather than
     * an unrelated one.
     *
     * It is keyed to the employee rather than the click for the reason the reserving
     * version had to be: `release` is reachable only through `validateCart` with the same
     * id, so any id that goes out of scope while holding units strands them until the
     * nightly collector runs. When the real Four51 cart add is wired, that call uses the
     * Four51 order id and this draft is only ever a preview key.
     */
    function draftOrderId() {
      // Keyed on the beneficiary, not the caller: a Champion checking selections for two
      // people in one session must not have the second compared against the first.
      var who = FOR || (Allocation.identity() || {}).employeeId;
      // No identity means no session, and `check()` cannot have got this far — but keep
      // it stable rather than minting a fresh key per click.
      return 'picker-draft:' + (who || 'anon');
    }

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
      if (err.status === 401) {
        // A 401 under the shim is an allowlist question, and the only useful thing to say
        // is which login was tried. Saying "no username" is just as actionable as naming
        // one — it points at a different fix — and both beat a bare failure.
        if (err.shimUsername) {
          return 'Signed in as "' + err.shimUsername + '", which is not set up for allocation yet.';
        }
        if (err.shimAttempted) {
          return 'Could not read your Four51 username, so allocation could not verify you.';
        }
        return 'Your session could not be verified.';
      }
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
    /**
     * The Four51 product id for a chosen row.
     *
     * Sizes are not variants in this theme — each size is its own product, and the size is
     * the last segment of the InteropID (`HTZ-POLOSS-M-HZ` + `-L`). `categoryCtrl.js:926`
     * relies on the same shape when it reads a size back out of one. Our API resolves the
     * sized id onto the base product by longest prefix, so the ledger still meters the
     * product rather than the size.
     */
    function sizedId(productId, size) {
      return size ? productId + '-' + size : productId;
    }

    /** Everything picked, as { productId, size, qty }. */
    function chosen() {
      var out = [];
      angular.forEach($scope.alloc.picked, function(row, productId) {
        if (!row || row.qty < 1) return;
        out.push({ productId: productId, size: row.size, qty: row.qty });
      });
      return out;
    }

    /**
     * Fetch the Four51 product for each chosen row.
     *
     * A product our catalogue knows about may simply not exist in Four51 yet — the mapping
     * is maintained on our side and the catalogue on theirs. Rather than dropping such a
     * line silently, which would put a short order in the cart and look like the employee
     * mis-clicked, the missing ids are collected and named.
     */
    function fetchProducts(rows) {
      var found = {};
      var missing = [];
      var work = rows.map(function(row) {
        var d = $q.defer();
        var id = sizedId(row.productId, row.size);
        try {
          Product.get(id, function(product) {
            if (product && product.InteropID) found[id] = product;
            else missing.push(id);
            d.resolve();
            $rootScope.$evalAsync();
          });
        } catch (e) {
          missing.push(id);
          d.resolve();
        }
        return d.promise;
      });
      return $q.all(work).then(function() {
        return { found: found, missing: missing };
      });
    }

    /**
     * Put the selection in the Four51 cart and go there.
     *
     * Three steps, in this order for a reason:
     *
     *   1. **Preview.** Holds nothing, so a selection that does not fit is refused before
     *      the Four51 order is touched at all. Without it a refusal would leave half a
     *      cart behind for the employee to clean up.
     *   2. **Resolve the products.** A missing one is named rather than dropped.
     *   3. **Save.** This is where the allocation is actually reserved — `Order.save` goes
     *      through the gate in `allocationGate.js`, which is also what catches anything
     *      that changed between the preview and now.
     *
     * Then to the cart, because the cart is where someone checks the order over before
     * checking out. This button fills the cart; it does not place an order.
     */
    $scope.alloc.addToCart = function() {
      var rows = chosen();
      if (!rows.length || $scope.alloc.submitting) return;

      $scope.alloc.submitting = true;
      $scope.alloc.result = null;

      var lines = rows.map(function(row, i) {
        return {
          four51LineId: 'pick-' + (i + 1),
          four51ProductId: sizedId(row.productId, row.size),
          quantity: row.qty
        };
      });

      Allocation.previewCart(draftOrderId(), lines, FOR)
        .then(function() {
          return fetchProducts(rows);
        })
        .then(function(resolved) {
          if (resolved.missing.length) {
            return $q.reject({
              local: 'These are not in the catalogue yet: ' + resolved.missing.join(', ') +
                     '. Your uniform champion can help.'
            });
          }

          var order = $scope.currentOrder || {};
          if (!order.LineItems) order.LineItems = [];

          angular.forEach(rows, function(row) {
            order.LineItems.push({
              Product: resolved.found[sizedId(row.productId, row.size)],
              Quantity: row.qty,
              ShipAccount: null,
              ShipAddressID: null,
              ShipFirstName: null,
              ShipLastName: null,
              Shipper: null,
              ShipperID: null,
              ShipperName: null,
              // Sizes are separate products here, so there is no variant to choose.
              Variant: null
            });
          });

          // A champion's on-behalf order is still their Four51 order, so the beneficiary
          // has to be remembered against it for the gate and for checkout.
          if (FOR && order.ID) Allocation.setOrderBeneficiary(order.ID, FOR);

          var d = $q.defer();
          Order.save(order, function(saved) { d.resolve(saved); }, function(message) {
            d.reject({ local: message || 'That order could not be saved.' });
          });
          return d.promise;
        })
        .then(function(saved) {
          if (FOR && saved && saved.ID) Allocation.setOrderBeneficiary(saved.ID, FOR);
          $scope.alloc.submitting = false;
          $location.path('/cart').search({});
        })
        .catch(function(err) {
          $scope.alloc.submitting = false;
          var messages;
          if (err && err.local) {
            messages = [err.local];
          } else if (err && err.status === 409) {
            messages = Allocation.refusalText(err.body);
          } else if (err && (err.network || err.status === 0)) {
            messages = ['Could not reach the allocation service. Please try again.'];
          } else {
            messages = ['Your selection could not be added just now. Please try again.'];
          }
          $scope.alloc.result = { ok: false, messages: messages };
        });
    };

    $scope.alloc.load = function() {
      if (!$scope.alloc.enabled) return;
      $scope.alloc.loading = true;
      $scope.alloc.error = null;

      Allocation.eligibility(FOR)
        .then(function(eligibility) {
          // A Champion has no allocation of their own, so this page with nobody named is
          // a dead end for them — it would render an empty picker for units they never
          // get. Send them to choose someone instead. The role is only known once the
          // session resolves, which is why this is here rather than before the call.
          if (!FOR && (Allocation.hasRole('champion') || Allocation.hasRole('admin'))) {
            $scope.alloc.loading = false;
            $location.path('/champion').search({});
            return $q.reject({ redirected: true });
          }
          $scope.alloc.eligibility = eligibility;
          if (eligibility && eligibility.status !== 'eligible') return null;
          return Allocation.entitlement(FOR);
        })
        .then(function(view) {
          if (view) {
            $scope.alloc.view = view;
            $scope.alloc.onBehalf = !!view.onBehalf;
            $scope.alloc.beneficiaryId = view.employeeId;
            $scope.alloc.brandKey = brandKeyFor(view.brand);
            $scope.alloc.closed = view.seasonalClosed || [];
            $scope.alloc.pools = Allocation.inDisplayOrder(view.pools);
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
          // A redirect is not a failure; showing an error under a page that is leaving
          // would flash a message nobody can act on.
          if (err && err.redirected) return;
          $scope.alloc.error = describe(err);
          $scope.alloc.loading = false;
        });
    };

    $scope.alloc.load();
  }]);
