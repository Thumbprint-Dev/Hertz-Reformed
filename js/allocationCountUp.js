/**
 * Count a number up to its value when the value arrives.
 *
 *   <span hz-count-up="home.totalRemaining" hz-count-up-delay="120"></span>
 *
 * Used on the landing page's allocation band. Those figures come from the API a beat after
 * the page does — the band sits behind a loading skeleton until `/me/eligibility` and
 * `/me/entitlement` answer — so they arrive already set to their final value with nothing
 * marking the moment. Counting them up turns that unavoidable wait into the point the page
 * comes alive, and puts the eye on the number that matters.
 *
 * ## It owns the text node
 *
 * `{{home.totalRemaining}}` rewrites its text node on every digest, so a directive writing
 * to the same node fights the interpolation and shows as flicker, or as a number that snaps
 * back mid-count. The interpolation has to be *replaced* by this, never decorated with it —
 * see `partials/homeView.html`.
 *
 * ## Two cases, one watch
 *
 * The headline total exists from page load and goes `0 → N` when the entitlement lands.
 * Each pool cell is *created* by `ng-repeat` with its value already set, so it has nothing
 * to change to. A `$watch` covers both: the first fires on change, the second on its first
 * evaluation, and either way the animation runs from the previous number to the new one.
 *
 * ## Why it writes outside the digest
 *
 * `element.text()` on each frame rather than a scope assignment: sixty digests a second to
 * move one label would make every watcher on the page run sixty times a second for the
 * length of the animation. Nothing else needs to know the intermediate values — they are
 * not data, they are motion.
 *
 * ## It lands exactly
 *
 * The final frame assigns the target itself rather than whatever the easing rounds to. A
 * counter that settles on 14 of 15 is worse than no animation at all, because the number it
 * leaves on screen is wrong.
 */
four51.app.directive('hzCountUp', ['$window', function($window) {
  /** Long enough to read as deliberate, short enough not to delay the answer. */
  var DURATION = 800;

  /**
   * A beat before starting, by default.
   *
   * Not decoration — without it the headline figure did not animate at all. The value
   * arrives in the same digest that renders the whole band, and starting inside that work
   * means the first frame lands, the main thread is then busy, and the next frame arrives
   * after the animation's whole duration has already elapsed — so it jumps straight to the
   * end. Measured: the number sat at 0, then snapped to 14 seven seconds later, with no
   * frame in between.
   *
   * The pool cells never showed this, because their stagger already pushed them past the
   * render. Rather than leave that as a trap for whoever uses this next, waiting is the
   * default: let the page finish drawing, then animate.
   */
  var DEFAULT_DELAY = 80;

  /**
   * Ease-out cubic: quick off the mark, decelerating into the final number.
   *
   * Linear counting reads like a loading spinner — mechanical, and it stops dead. Easing
   * out is what makes it feel like the figure is settling into place.
   */
  function easeOut(t) {
    var inv = 1 - t;
    return 1 - inv * inv * inv;
  }

  /**
   * Whether the viewer has asked for less motion.
   *
   * Checked per animation rather than once at load, because the preference can change
   * while the page is open. `matchMedia` is absent in some embedded webviews, and an
   * absent API is not consent — it just means we cannot tell, so we animate.
   */
  function prefersReducedMotion() {
    return !!($window.matchMedia && $window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var frame = null;
      var timer = null;
      // An explicit 0 disables the wait; absent or unparseable takes the default.
      var asked = parseInt(attrs['hzCountUpDelay'], 10);
      var delay = isNaN(asked) ? DEFAULT_DELAY : asked;
      // What is currently on screen. The animation runs from here, so a value that changes
      // again mid-flight continues from where the eye is rather than jumping back to zero.
      var shown = 0;

      var raf = $window.requestAnimationFrame && $window.requestAnimationFrame.bind($window);
      var cancel = $window.cancelAnimationFrame && $window.cancelAnimationFrame.bind($window);

      function stop() {
        if (frame !== null && cancel) cancel(frame);
        if (timer !== null) $window.clearTimeout(timer);
        frame = null;
        timer = null;
      }

      function settle(value) {
        shown = value;
        element.text(String(value));
      }

      function run(to) {
        var from = shown;
        var distance = to - from;
        var started = null;

        function step(now) {
          if (started === null) started = now;
          var elapsed = now - started;
          if (elapsed >= DURATION) {
            // The target itself, not the eased approximation of it.
            settle(to);
            frame = null;
            return;
          }
          element.text(String(Math.round(from + distance * easeOut(elapsed / DURATION))));
          frame = raf(step);
        }

        frame = raf(step);
      }

      scope.$watch(attrs['hzCountUp'], function(value) {
        stop();

        var target = Number(value);
        if (value === null || value === undefined || isNaN(target)) {
          element.text('');
          shown = 0;
          return;
        }

        // No motion wanted, no frames available, or nothing to travel: just be the number.
        if (!raf || prefersReducedMotion() || target === shown) {
          settle(target);
          return;
        }

        if (delay > 0) {
          // Staggered cells cascade rather than firing as one block. Show where we are
          // starting from so the row is not briefly blank while it waits its turn.
          element.text(String(shown));
          timer = $window.setTimeout(function() {
            timer = null;
            run(target);
          }, delay);
          return;
        }

        run(target);
      });

      // A count still running when the view is torn down would keep writing into a node
      // that is no longer on the page.
      scope.$on('$destroy', stop);
    }
  };
}]);
