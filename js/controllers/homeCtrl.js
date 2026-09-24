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
 * ## This page does not render the category tree
 *
 * It used to: a champion saw a grid built from `Category.tree()`, headed "Buy a la carte".
 * In this tenant that tree has one top-level category, `orderob`, so the grid rendered a
 * single enormous empty tile labelled "Order On Behalf" — duplicating the button beneath
 * it and pointing at a category that cannot know whose allocation it spends.
 *
 * Browsing a catalogue is the catalogue's job. This page is a launcher: the hero, the two
 * champion doors, and for an employee their allocation. Anything that needs the tree
 * should read it where it is used, not here.
 */
four51.app.controller('HomeCtrl', ['$scope', 'Allocation',
  function($scope, Allocation) {

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
      /** Orderable pools — one landing-page cell each. */
      pools: [],
      totalRemaining: 0,
      totalGranted: 0,
      /** In the cart, held against the allocation but not yet ordered. */
      totalReserved: 0,
      /** Width of the progress bar, as a percentage. */
      percentLeft: 0,
      closed: [],
      heroImage: HERO_IMAGE,
      /** Where the two champion entries go. */
      alaCarteHref: 'catalog',
      onBehalfHref: 'champion'
    };

    /**
     * Where the champion entries go.
     *
     * "Order on behalf" is the beneficiary picker at /champion, not a Four51 category. A
     * category can only show products; it has no idea *whose* allocation is being spent,
     * so ordering straight into one would meter the champion's own. The picker asks who
     * first and opens the uniform picker with `?for=<employeeId>`, which is what carries
     * the beneficiary through the cart gate and into checkout.
     *
     * À la carte is genuinely a category, because it is a plain catalogue purchase charged
     * to the location. Set this to its InteropID when Hertz creates it.
     *
     * Empty falls back to the catalogue root, NOT to the first category in the tree. That
     * used to be the fallback and it was actively wrong: the first top-level category in
     * this tenant is `orderob`, so "Buy à la carte" led to Order On Behalf — a category
     * that cannot know whose allocation it spends. The root shows everything the champion
     * may buy, which is the honest answer until the real category exists.
     */
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

    function categoryHref(interopId) {
      return interopId ? 'catalog/' + interopId : 'catalog';
    }

    $scope.home.load = function() {
      if (!$scope.home.enabled) return;
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
            $scope.home.pools = Allocation.inDisplayOrder(view.pools);
            var remaining = 0, granted = 0, held = 0;
            angular.forEach(view.pools || [], function(p) {
              remaining += p.remaining;
              granted += p.granted;
              held += p.reserved || 0;
            });
            $scope.home.totalRemaining = remaining;
            $scope.home.totalGranted = granted;
            // Units in the cart, already deducted from `remaining`. Named here because the
            // landing page is where the headline figure is read, and a figure that has
            // quietly dropped is the one people ask about.
            $scope.home.totalReserved = held;
            // And where they are: the employee's own cart, or an order a Uniform Champion is
            // placing for them, which the employee cannot open.
            $scope.home.holds = Allocation.splitHolds(view);
            // Guarded rather than assumed: an employee whose kit grants nothing would
            // otherwise divide by zero and render a NaN-wide bar.
            $scope.home.percentLeft = granted > 0 ? Math.round((remaining / granted) * 100) : 0;
          }
          $scope.home.alaCarteHref = categoryHref(A_LA_CARTE_CATEGORY);
          $scope.home.loading = false;
        })
        .catch(function(err) {
          $scope.home.error = describe(err);
          $scope.home.loading = false;
        });
    };

    $scope.home.load();

    // An order cancelled in Four51 gives its items back (orders/cancel.ts on the API). Asked
    // here because this is where the allocation is read, and alongside the load rather than
    // before it so the page never waits on it: when something did come back, the band is
    // loaded again with the restored figures. Champions ask too, because the orders they
    // placed for their team are theirs to see in Four51.
    if ($scope.home.enabled) {
      Allocation.checkCancellations()
        .then(function(res) {
          if (res && res.cancelled && res.cancelled.length) $scope.home.load();
        })
        .catch(function() {
          // Not this page's failure to report: the allocation it shows is still right as of
          // the last settlement, and the check runs again next session.
        });
    }
  }]);
