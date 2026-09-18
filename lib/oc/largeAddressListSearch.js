/*
 * Address lookup (shipping and billing).
 *
 * Three things were wrong here and all of them landed on the checkout page.
 *
 * 1. Each template injected a <style> block into the document. `.count` was UNSCOPED, so it
 *    applied to any `.count` anywhere on the site, it forced pure black on a hint sitting
 *    beside a muted field name, and its first declaration read `float;left;` — a syntax
 *    error, so the float never applied and the rest of the rule survived on the parser's
 *    error recovery. Both blocks are gone; the dropdown rules now live in custom.css scoped
 *    under `.hz-co .largeaddress`, next to what they have to match.
 *
 * 2. The hint lived INSIDE the <label>, making the field's name and a parenthetical
 *    instruction one long run of text — and `.view-form-icon label` positions labels
 *    absolutely, so the whole thing floated above the field. The label is now just the field
 *    name; the hint is a sibling below the input, written as a sentence.
 *
 * 3. `<i class="fa fa-map-marker">` was painted over the input by `.view-form-icon`,
 *    covering the first 30px of the field — the part you click into and type. A pin in an
 *    address box says nothing the label does not.
 *
 * Every binding is untouched: ng-model, required, ng-change, typeahead, ng-readonly and the
 * showTip / showResult flags the controllers set.
 */
angular.module('OrderCloud-LargeAddressListSearch', []);

angular.module('OrderCloud-LargeAddressListSearch')
    .directive('largeshipaddresssearch', largeshipaddresssearch)
    .controller('LargeShipAddressSearchCtrl', LargeShipAddressSearchCtrl)
    .directive('largebilladdresssearch', largebilladdresssearch)
    .controller('LargeBillAddressSearchCtrl', LargeBillAddressSearchCtrl)
    .factory('LargeAddressList', LargeAddressList)
;

function largeshipaddresssearch() {
    var directive = {
        restrict: 'E',
        controller: 'LargeShipAddressSearchCtrl',
        template: template
    };
    return directive;

    function template() {
        return [
            '<div class="row largeaddress view-form-icon">',
            '<div class="col-xs-12">',
            '<label class="hz-addr-label">{{("Shipping" | r) + " " + ("Address" | r) | xlat}}</label>',
            '<div class="form-group">',
            '<input class="form-control" type="text" ng-readonly="readonlyshipping" ng-model="ShipAddress" required ng-change="searchShipAddresses(ShipAddress)" typeahead-min-length="3" typeahead="address as (address.AddressName + \' \' + (address.FirstName || \'\') + \' \' + (address.LastName || \'\') + \' \' + (address.Street1 || \'\') + \' \' + (address.Street2 || \'\') + \' \' + (address.City || \'\') + \' \' + (address.State || \'\') + \' \' + (address.Zip || \'\')) for address in shipaddresses | filter:$viewValue | limitTo:10" />',
            '<p class="hz-addr-hint" ng-show="showTip">Type your location code, department number or address, then pick it from the list.</p>',
            '<p class="hz-addr-hint hz-addr-hint--bad" ng-show="showResult">No matching address. Check the code and try again.</p>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }
}

LargeShipAddressSearchCtrl.$inject = ['$scope', 'AddressList', 'LargeAddressList', 'Address'];
function LargeShipAddressSearchCtrl($scope, AddressList, LargeAddressList, Address) {

    AddressList.shipping(function(list) {
        $scope.shipaddresses = list;
        $scope.readonlyshipping = false;
        if($scope.shipaddresses.length == 1){
            $scope.ShipAddressID = list[0].ID;
            $scope.ShipAddress = list[0];
            $scope.readonlyshipping = true;
        }
        else{
            $scope.shipaddresses = [' '];
        }
    });

    $scope.shipAddressCount = null;
    $scope.showTip = true;
    $scope.showResult = false;
    $scope.shipaddressform = false;

    $scope.$watch('ShipAddress', function(newValue) {
        if (!newValue || !newValue.ID) {
            $scope.orderShipAddress = {};
            $scope.currentOrder.ShipAddressID = null;
            $scope.showTip = true;
            $scope.showResult = false;
        }
        else {
            $scope.orderShipAddress = newValue;
            $scope.currentOrder.ShipAddress = newValue;
            if ($scope.currentOrder) {
                $scope.currentOrder.ShipAddressID = newValue.ID;
                $scope.currentOrder.ShipFirstName = null;
                $scope.currentOrder.ShipLastName = null;
                angular.forEach($scope.currentOrder.LineItems, function (item) {
                    item.ShipFirstName = null;
                    item.ShipLastName = null;
                });
            }
            if (newValue) {
                if ($scope.user.Permissions.contains('EditShipToName') && !$scope.orderShipAddress.IsCustEditable) {
                    angular.forEach($scope.currentOrder.LineItems, function(item) {
                        item.ShipFirstName = $scope.orderShipAddress.FirstName;
                        item.ShipLastName = $scope.orderShipAddress.LastName;
                    });
                }
                $scope.setShipAddressAtOrderLevel();
            }
        }
        //account for New Address
        $scope.$on('event:AddressSaved', function(event, address) {
            if (address.IsShipping) {
                $scope.ShipAddress = address;
            }
        });

    });

    $scope.searchShipAddresses = function(searchTerm) {
        $scope.shipaddresses = [' ']; //this sets shipaddresses to something while we wait for the search so we don't have to modify existing ng-show/hide(s) for address form / ship method
        if (searchTerm && searchTerm.length > 2) {
            LargeAddressList.queryShipping(searchTerm, function(list, count) {
                $scope.shipaddresses = list;
                $scope.shipAddressCount = count; // we will use count to add a filter for the user
                if (count === 0) {
                    $scope.showTip = false;
                    $scope.showResult = true;
                }
                else {
                    $scope.showTip = true;
                    $scope.showResult = false;
                }
            });
        }
    };

    if ($scope.currentOrder.ShipAddressID) {
        Address.get($scope.currentOrder.ShipAddressID, function(add) {
            $scope.ShipAddress = add;
        });
    }
}

function largebilladdresssearch() {
    var directive = {
        restrict: 'E',
        controller: 'LargeBillAddressSearchCtrl',
        template: template
    };
    return directive;

    function template () {
        return [
            '<div class="row largeaddress view-form-icon" ng-show="!copyShipAddress">',
            '<div class="col-xs-12">',
            '<label class="hz-addr-label">{{("Billing" | r) + " " + ("Address" | r) | xlat}}</label>',
            '<div class="form-group">',
            '<input class="form-control" type="text" ng-model="BillAddress" ng-readonly="readonlybilling" required ng-change="searchBillAddresses(BillAddress)" typeahead-min-length="3" typeahead="address as (address.AddressName + \' \' + (address.FirstName || \'\') + \' \' + (address.LastName || \'\') + \' \' + (address.Street1 || \'\') + \' \' + (address.Street2 || \'\') + \' \' + (address.City || \'\') + \' \' + (address.State || \'\') + \' \' + (address.Zip || \'\')) for address in billaddresses | filter:$viewValue | limitTo:10" />',
            '<p class="hz-addr-hint" ng-show="showBillTip">Start typing to find your address, then pick it from the list.</p>',
            '<p class="hz-addr-hint hz-addr-hint--bad" ng-show="showBillResult">No matching address. Check it and try again.</p>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }
}

LargeBillAddressSearchCtrl.$inject = ['$scope', 'AddressList', 'LargeAddressList', 'Address'];
function LargeBillAddressSearchCtrl($scope, AddressList, LargeAddressList, Address) {

    AddressList.billing(function(list) {
        $scope.billaddresses = list;
        $scope.readonlybilling = false;
        if($scope.billaddresses.length == 1){
            $scope.BillAddressID = list[0].ID;
            $scope.BillAddress = list[0];
            $scope.readonlybilling = true;
        }
        else{
            $scope.billaddresses = [' '];
        }
    });

    $scope.billaddressform = false;
    $scope.billAddressCount = null;
    $scope.showBillTip = true;
    $scope.showBillResult = false;

    $scope.$watch('BillAddress', function(newValue) {

        if (!newValue || !newValue.ID) {
            $scope.BillAddressID = null;
            $scope.currentOrder.BillAddressID = null;
            $scope.showBillTip = true;
            $scope.showBillResult = false;
        }
        else {
            if ($scope.currentOrder) {
                $scope.currentOrder.BillAddress = newValue;
                $scope.currentOrder.BillAddressID = newValue.ID;
                $scope.BillAddressID = newValue.ID;
                $scope.BillAddress = newValue;
            }

        }
        //account for New Address
        $scope.$on('event:AddressSaved', function(event, address) {
            if (address.IsBilling) {
                $scope.BillAddress = address;
            }
        });
    });

    $scope.searchBillAddresses = function(searchTerm) {
        if (searchTerm && searchTerm.length > 2) {
            $scope.billaddresses = [' '];
            $scope.billAddressCount = null;
            LargeAddressList.queryBilling(searchTerm, function(list, count) {
                $scope.billaddresses = list;
                $scope.billAddressCount = count; // we will use count to add a filter for the user
                if (count === 0) {
                    $scope.showBillTip = false;
                    $scope.showBillResult = true;
                }
                else {
                    $scope.showBillTip = true;
                    $scope.showBillResult = false;
                }
            });
        }
    };

    if ($scope.currentOrder.BillAddressID) {
        Address.get($scope.currentOrder.BillAddressID, function(add) {
            $scope.BillAddress = add;
        });
    }

}

LargeAddressList.$inject = ['$resource', '$451'];
function LargeAddressList($resource, $451) {
    var service = {
        queryShipping: _queryShipping,
        queryBilling: _queryBilling
    };
    return service;

    function _queryShipping(searchTerm, success) {
        $resource($451.api('address/shipping')).get({ key: searchTerm, page: 1, pagesize: 100}).$promise.then(function (list) {
            success(list.List, list.Count);
        });
    }

    function _queryBilling(searchTerm, success) {
        $resource($451.api('address/billing')).get({ key: searchTerm, page: 1, pagesize: 100}).$promise.then(function (list) {
            success(list.List, list.Count);
        });
    }
}
