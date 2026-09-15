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

    /**
     * The hero photograph, top right of the landing page.
     *
     * Put the file's path here and the placeholder disappears — that is the whole change.
     * Relative paths resolve against the theme root, so a file dropped in `css/img/`
     * is `'css/img/hero.jpg'`.
     *
     * §4.1 asks for black and white; this one runs in colour under the §4.3 carve-out for
     * yellow that is really in the scene. See `.hz-lp-hero-img` in custom.css, where the
     * grayscale filter is one uncommented line away.
     */
    var HERO_IMAGE = 'css/img/hero-lifestyle.jpg';

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
      /** Orderable pools — one landing-page cell each. */
      pools: [],
      totalRemaining: 0,
      totalGranted: 0,
      /** Width of the progress bar, as a percentage. */
      percentLeft: 0,
      closed: [],
      heroImage: HERO_IMAGE,
      /**
       * Where "Buy à la carte" goes.
       *
       * Hertz will author a dedicated à la carte category in the Four51 admin; when it
       * exists, name its InteropID in A_LA_CARTE_CATEGORY below and this points at it.
       * Until then it falls back to the first category the tree returns, so the entry
       * works rather than leading nowhere.
       */
      alaCarteHref: 'catalog'
    };

    /** InteropID of the à la carte category, once Hertz creates it. */
    var A_LA_CARTE_CATEGORY = '';

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

    /**
     * Reading order for the allocation cells.
     *
     * The API returns pools alphabetically, which puts Belt — one item — first and buries
     * the two pools carrying two thirds of the allocation. This is the order Hertz's
     * design uses and the order people get dressed in. Anything not named here keeps its
     * API position at the end, so a new pool appears rather than disappearing.
     */
    var POOL_ORDER = ['Polos', 'Bottoms', 'Layering', 'Headwear', 'Belt'];

    function inDisplayOrder(pools) {
      var known = [];
      var rest = [];
      angular.forEach(pools || [], function(p) {
        (POOL_ORDER.indexOf(p.name) > -1 ? known : rest).push(p);
      });
      known.sort(function(a, b) {
        return POOL_ORDER.indexOf(a.name) - POOL_ORDER.indexOf(b.name);
      });
      return known.concat(rest);
    }

    function describe(err) {
      if (!err) return 'Could not load your allocation.';
      if (err.noSession) return 'Please sign in to see your uniform allocation.';
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

    function alaCarteHref(list) {
      if (A_LA_CARTE_CATEGORY) return 'catalog/' + A_LA_CARTE_CATEGORY;
      var first = (list || [])[0];
      return first ? first.href : 'catalog';
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

          // A Champion has no allocation of their own to show. They order on behalf of
          // their team and buy à la carte, so fetching an entitlement here would render a
          // counter for something they never spend. Skipping the call also means the band
          // never briefly appears and then vanishes once the role is known.
          if ($scope.home.isChampion) return null;

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
            $scope.home.pools = inDisplayOrder(view.pools);
            var remaining = 0, granted = 0;
            angular.forEach(view.pools || [], function(p) {
              remaining += p.remaining;
              granted += p.granted;
            });
            $scope.home.totalRemaining = remaining;
            $scope.home.totalGranted = granted;
            // Guarded rather than assumed: an employee whose kit grants nothing would
            // otherwise divide by zero and render a NaN-wide bar.
            $scope.home.percentLeft = granted > 0 ? Math.round((remaining / granted) * 100) : 0;
          }
          return loadCategories();
        })
        .then(function(list) {
          if (list) $scope.home.categories = list;
          $scope.home.alaCarteHref = alaCarteHref(list);
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
