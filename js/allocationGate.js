/**
 * The cart gate.
 *
 * Four51 exposes no server-side checkout hook — the spike settled that
 * (`docs/09-SPIKE-FINDINGS.md`) — so enforcement has to happen before the storefront saves
 * an order. This is that "before".
 *
 * ## Why it wraps the service and not each controller
 *
 * `Order.save` is the one function every cart write goes through: adding a product,
 * editing a quantity, deleting a line, the cart page's own autosaves. Calling the gate from
 * each controller means finding all of them today and remembering on every future one, and
 * the cost of missing one is silent over-allocation. Wrapping the service gates the paths
 * nobody thought about, including the ones added after this file.
 *
 * ## Why `run` and not `$provide.decorator`
 *
 * In Angular 1.2 a `config` block is pushed onto the *same* queue as provider
 * registrations and runs in declaration order, so `$provide.decorator('Order', …)` only
 * works if this file is loaded after `orderService.js`. It was not, and the whole app died
 * on `unknown provider: OrderProvider` — a white screen, not a degraded cart.
 *
 * A `run` block executes once the injector is built, so every service exists and the order
 * of the script tags stops mattering. `Order` is a singleton object, so replacing its
 * methods here reaches every consumer, and run blocks execute before any controller does.
 *
 * ## What it does on failure, and why
 *
 * **A 409 blocks the save.** That is the gate doing its job: the API refused, and the
 * refusal text is already written for a shopper.
 *
 * **Anything else lets the save through.** A network error, a 500, a timeout — the order
 * proceeds unmetered and the nightly reconciliation posts the compensating entry, which is
 * exactly the job reconciliation already exists for: `PUT order/repeat/:id` bypasses this
 * gate entirely and always has, so an unmetered order is a condition the system is built to
 * detect and correct rather than one it has never seen.
 *
 * The alternative — fail closed — makes our uptime a hard dependency of Four51's cart. A
 * blip in our service would stop every employee in the company from ordering anything,
 * including people whose allocation is not in question. That trade is wrong in this
 * direction: the cost of failing open is a bounded over-allocation that reconciliation
 * catches and an operator can see, and the cost of failing closed is a storefront that does
 * not work. Recorded as decision 51.
 *
 * ## Giving units back
 *
 * Reserving is only half of it. Cancelling a cart and deleting a line both bypass `save`
 * entirely — they call `order/:id` DELETE and `order/:id/lineitem/:id` DELETE — so without
 * the wrappers below, emptying a cart left the allocation held until the nightly collector
 * ran. Someone who changed their mind watched their allocation stay spent, which reads as
 * the system losing their items.
 *
 * Both release *after* Four51 confirms, and neither blocks on our answer. Releasing first
 * would hand back units for a line that is still in the cart if the delete then failed, and
 * holding a delete on our bookkeeping would make a cancel feel broken when our service is
 * slow.
 *
 * ## Products we do not own
 *
 * Lines whose product is not in `catalog_map` come back in `unmapped` and are not metered.
 * A promotional mug in the same cart as a polo is not an allocation item and this must not
 * pretend otherwise.
 */
four51.app.run(['Order', 'Allocation', function(Order, Allocation) {

    var save = Order.save;
    var submit = Order.submit;
    var remove = Order.delete;
    var removeLine = Order.deletelineitem;

    /** The lines the gate meters, in the shape the API takes. */
    /**
     * Where the order shipped, straight off the order.
     *
     * Recorded at checkout so a return label can be printed from the same address later:
     * the box goes back from wherever the uniform was sent. The order Four51 handed back wins
     * over the one we sent, and a line's address stands in when the order carries none.
     * Only the fields a label needs, and nothing when there is no street to send from.
     */
    function shipAddressOf(saved, sent) {
      var firstLine = function(o) { return o && o.LineItems && o.LineItems[0] && o.LineItems[0].ShipAddress; };
      var a = (saved && saved.ShipAddress) || (sent && sent.ShipAddress) || firstLine(saved) || firstLine(sent);
      if (!a || !a.Street1 || !a.City) return null;
      return {
        firstName: a.FirstName || null,
        lastName: a.LastName || null,
        companyName: a.CompanyName || null,
        street1: a.Street1,
        street2: a.Street2 || null,
        city: a.City,
        state: a.State || null,
        zip: a.Zip || null,
        country: a.Country || null,
        phone: a.Phone || null
      };
    }

    function linesOf(order) {
      var lines = [];
      angular.forEach((order && order.LineItems) || [], function(item, index) {
        var product = item && item.Product;
        var interopId = product && product.InteropID;
        var quantity = item && item.Quantity;
        if (!interopId || !quantity || quantity < 1) return;
        lines.push({
          // Four51 does not always have an ID on an unsaved line; the index is stable
          // within one save and the API only uses this to report which line refused.
          four51LineId: String((item.ID !== undefined && item.ID !== null) ? item.ID : index),
          four51ProductId: String(interopId),
          quantity: quantity
        });
      });
      return lines;
    }

    /**
     * Refusal text, in the shape the storefront's own error handlers expect.
     *
     * Never `LineItems[].Errors` — `categoryCtrl.js:84` rewrites that unconditionally to
     * "out of stock", which would turn "you have reached your Polos allocation" into a
     * stock message and send someone to the wrong person for help.
     */
    function refusalMessage(err) {
      var messages = Allocation.refusalText(err && err.body);
      return messages.length ? messages.join(' ') : 'That order exceeds your uniform allocation.';
    }

    Order.save = function(order, success, error) {
      var orderId = order && order.ID;

      if (!Allocation.isEnabled()) {
        return save(order, success, error);
      }

      /**
       * The first save of a cart that does not exist yet.
       *
       * This used to return here unmetered, on the reasoning that an order with no id has
       * no reservation to reconcile against. True, and it left the hole: an employee whose
       * cart is empty has no `CurrentOrderID`, so `four51Ctrl` sets `currentOrder` to null,
       * the picker sends `{}`, and **their first add was never metered at all**. The cart
       * filled up and the landing page still read 15 of 15, because nothing had been
       * reserved.
       *
       * The id only exists once Four51 has assigned it, so the order of operations has to
       * invert here: save first, then reserve against the id that comes back. Every later
       * save takes the metered path below.
       *
       * A refusal cannot be enforced on this path — the order is already written by the
       * time we could hear one — so it is logged rather than surfaced. That is the right
       * trade for a first add: the picker has already previewed the same selection against
       * the same balance, so a refusal here means something changed in between, and
       * `validateCart` reconciles the hold to whatever the cart really holds the next time
       * anything touches it.
       */
      if (!orderId) {
        return save(order, function(saved) {
          var newId = saved && saved.ID;
          if (newId) {
            // Prefer the saved order: Four51 may have merged or renumbered lines, and the
            // hold must match what the cart actually holds. Fall back to what we sent if
            // the response comes back without products attached.
            var newLines = linesOf(saved);
            if (!newLines.length) newLines = linesOf(order);
            Allocation.validateCart(newId, newLines, Allocation.orderBeneficiary(newId))
              .catch(function(err) {
                if (window.console && console.warn) {
                  console.warn('new cart saved but not reserved; reconciliation will catch it', err);
                }
              });
          }
          if (angular.isFunction(success)) success(saved);
        }, error);
      }

      var lines = linesOf(order);
      Allocation.validateCart(orderId, lines, Allocation.orderBeneficiary(orderId))
        .then(function() {
          save(order, success, error);
        })
        .catch(function(err) {
          if (err && err.status === 409) {
            if (angular.isFunction(error)) error(refusalMessage(err));
            return;
          }
          // Unreachable or broken: let commerce continue and let reconciliation catch it.
          if (window.console && console.warn) {
            console.warn('allocation gate unavailable; order saved unmetered', err);
          }
          save(order, success, error);
        });
    };

    /**
     * Cancelling the cart gives everything back.
     *
     * `validateCart` reconciles an order's hold *to* the lines it is given, so an empty
     * list is the release — the same path a cart edited down to nothing already takes.
     */
    Order.delete = function(order, success, error) {
      var orderId = order && order.ID;

      remove(order, function(result) {
        if (Allocation.isEnabled() && orderId) {
          Allocation.validateCart(orderId, [], Allocation.orderBeneficiary(orderId))
            .catch(function(err) {
              if (window.console && console.warn) {
                console.warn('allocation release failed; the collector will catch it', err);
              }
            })
            .finally(function() {
              Allocation.clearOrderBeneficiary(orderId);
            });
        }
        if (angular.isFunction(success)) success(result);
      }, error);
    };

    /**
     * Removing one line reconciles to what is left.
     *
     * Four51 returns the updated order, or nothing at all when that was the last line. The
     * hold follows whatever came back rather than being decremented, because a subtraction
     * can drift from the cart and the reconcile-to-target cannot.
     */
    Order.deletelineitem = function(id, lineitemid, success, error) {
      removeLine(id, lineitemid, function(updated) {
        if (Allocation.isEnabled() && id) {
          Allocation.validateCart(id, linesOf(updated), Allocation.orderBeneficiary(id))
            .catch(function(err) {
              if (window.console && console.warn) {
                console.warn('allocation release failed; the collector will catch it', err);
              }
            });
        }
        if (angular.isFunction(success)) success(updated);
      }, error);
    };

    /**
     * Turn reservations into consumption, after Four51 has accepted the order.
     *
     * After, not before: if we consumed first and Four51 then rejected the submit, the
     * ledger would record units against an order that does not exist, and nothing would
     * ever correct it. This way the worst case is an accepted order we failed to record,
     * which is precisely the discrepancy reconciliation looks for.
     */
    Order.submit = function(order, success, error) {
      var orderId = order && order.ID;

      submit(order, function(saved) {
        if (Allocation.isEnabled() && orderId) {
          Allocation.checkout(orderId, linesOf(order), Allocation.orderBeneficiary(orderId),
                              shipAddressOf(saved, order),
                              (saved && saved.ExternalID) || (order && order.ExternalID) || null)
            .catch(function(err) {
              if (window.console && console.warn) {
                console.warn('allocation checkout failed; reconciliation will correct', err);
              }
            })
            .finally(function() {
              Allocation.clearOrderBeneficiary(orderId);
            });
        }
        // The order is placed either way. Never hold a confirmation on our bookkeeping.
        if (angular.isFunction(success)) success(saved);
      }, error);
    };

}]);
