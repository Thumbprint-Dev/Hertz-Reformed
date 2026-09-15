/**
 * The landing page — a branded launcher, not a product grid.
 *
 * Signing in used to redirect to `/catalog`, which is empty for anyone whose Four51 groups
 * are not yet configured: a blank screen under a red banner apologising for it.
 *
 * This page is the front door. It shows the brand the employee actually shops, what they
 * have left, and the ways into the catalogue — plus, for a Uniform Champion, the two
 * things only they can do.
 *
 * ## Categories come from Four51, not from here
 *
 * The category tree is Four51's, maintained in the admin. This page reads it and renders
 * whatever is there rather than hardcoding a list, so adding or renaming a category is an
 * admin change with no deploy. `Category.tree()` caches in `localStorage` with **no
 * expiry**, so a newly created category will not appear until that key is cleared — which
 * is a Four51 behaviour, not a bug here (`docs/04-FOUR51-NOTES.md`).
 */
four51.app.controller('HomeCtrl', ['$scope', '$q', 'Allocation', 'Category',
  function($scope, $q, Allocation, Category) {

    // An object, never bare primitives: anything under an `ng-if` gets a child scope, and
    // writing to a bare name there shadows rather than updates.
    $scope.home = {
      enabled: Allocation.isEnabled(),
      loading: false,
      error: null,
      eligibility: null,
      view: null,
      brand: null,
      brandKey: 'hertz',
      isChampion: false,
      categories: [],
      totalRemaining: 0,
      totalGranted: 0,
      closed: []
    };

    /**
     * Brand to a CSS-safe key, so the theme can swap hero art and accents per brand.
     *
     * Defaults to `hertz` rather than throwing or rendering unbranded: an employee whose
     * brand we cannot read should still get a usable page, and Hertz is the majority.
     */
    function brandKeyFor(brand) {
      if (!brand) return 'hertz';
      var b = brand.toLowerCase();
      if (b.indexOf('dollar') > -1) return 'dollar';
      if (b.indexOf('thrifty') > -1) return 'thrifty';
      return 'hertz';
    }

    function describe(err) {
      if (!err) return 'Could not load your allocation.';
      if (err.noSession) return 'Please sign in to see your uniform allocation.';
      if (err.network || err.status === 0) return 'Could not reach the allocation service.';
      if (err.status === 403) return 'The allocation service refused this request.';
      if (err.status === 401) return 'Your session could not be verified.';
      return 'Could not load your allocation.';
    }

    /**
     * The categories this employee may shop.
     *
     * Four51 decides visibility by group, so whatever comes back is already scoped to
     * them — this does not filter, it only presents. Top-level categories only: the tree's
     * children are the drill-down the catalogue itself handles.
     */
    function loadCategories() {
      var d = $q.defer();
      try {
        Category.tree(function(tree) {
          var list = [];
          angular.forEach(tree || [], function(c) {
            if (c && c.Name) {
              list.push({
                name: c.Name,
                interopID: c.InteropID,
                href: 'catalog/' + c.InteropID
              });
            }
          });
          d.resolve(list);
        }, function() { d.resolve([]); });
      } catch (e) {
        // A category failure must not take the page down — the allocation summary and the
        // champion entries are still useful without it.
        d.resolve([]);
      }
      return d.promise;
    }

    $scope.home.load = function() {
      if (!$scope.home.enabled) {
        loadCategories().then(function(list) { $scope.home.categories = list; });
        return;
      }
      $scope.home.loading = true;
      $scope.home.error = null;

      Allocation.eligibility()
        .then(function(eligibility) {
          $scope.home.eligibility = eligibility;
          $scope.home.isChampion = Allocation.hasRole('champion') || Allocation.hasRole('admin');
          // Before day 90 there is no entitlement to fetch, and `/me/eligibility` already
          // carries the date access opens. Asking anyway returns an empty shell that reads
          // as "you have nothing" rather than "you are eligible on the 20th".
          if (eligibility && eligibility.status !== 'eligible') return null;
          return Allocation.entitlement();
        })
        .then(function(view) {
          if (view) {
            $scope.home.view = view;
            $scope.home.brand = view.brand;
            $scope.home.brandKey = brandKeyFor(view.brand);
            $scope.home.closed = view.seasonalClosed || [];
            var remaining = 0, granted = 0;
            angular.forEach(view.pools || [], function(p) {
              remaining += p.remaining;
              granted += p.granted;
            });
            $scope.home.totalRemaining = remaining;
            $scope.home.totalGranted = granted;
          }
          return loadCategories();
        })
        .then(function(list) {
          if (list) $scope.home.categories = list;
          $scope.home.loading = false;
        })
        .catch(function(err) {
          $scope.home.error = describe(err);
          $scope.home.loading = false;
          loadCategories().then(function(list) { $scope.home.categories = list; });
        });
    };

    $scope.home.load();
  }]);
