angular.module('OrderCloud-ProductSearchInput', []);

angular.module('OrderCloud-ProductSearchInput')
    .directive('productsearchinput', productsearchinput)
    .directive('productsearchinputnav', productsearchinputnav)
    .controller('ProductSearchInputCtrl', ProductSearchInputCtrl)
;

function productsearchinput() {
    var directive = {
        restrict: 'E',
        template: searchTemplate,
        controller: 'ProductSearchInputCtrl'
    };
    return directive;

    function searchTemplate() {
        return [
            '<form name="productSearchInput" ng-submit="executeSearch()">',
            '<div class="view-form-icon">',
            '<div class="input-group" style="margin:0 0 10px;">',
            '<input type="text" class="form-control" placeholder="{{\'Search\' | r}} {{\'Products\' | r}}" ng-model="productSearchTerm" style="border-top-left-radius: 4px;border-bottom-left-radius: 4px;"/>',
            '<i class="fa fa-search"></i>',
            '<span class="input-group-btn">',
            '<button type="submit" class="btn btn-default searchButton" ng-disabled="productSearchTerm == null || productSearchTerm == \'\'" style="background-color: #313131;border:#313131;">{{\'Search\' | r}}</button>',
            '</span>',
            '</div>',
            '</div>',
            '</form>'
        ].join('');
    }
}

function productsearchinputnav() {
    var directive = {
        restrict: 'E',
        template: searchNavTemplate,
        controller: 'ProductSearchInputCtrl'
    };
    return directive;

    function searchNavTemplate() {
        return [
            '<style>.navbar .container .navbar-nav.pull-right li a i.fa-search,.navbar .container-view .navbar-nav.pull-right li a i.fa-search{border-radius:0;border:none;text-align:center;padding:0 10px;margin-top:0}.product-search-display{position:fixed;top:-100%;left:0;right:0;height:60px;background-color:white;padding:38px 5px;opacity:0;z-index:1030;transition:all 300ms;-moz-transition:all 300ms;-webkit-transition:all 300ms}.product-search-display.active{top:0;opacity:1;transition:all 300ms;-moz-transition:all 300ms;-webkit-transition:all 300ms}.product-search-display .fa-angle-double-up{cursor:pointer;margin-top:5px}.fa-search{color:rgb(0,38,62)!important}</style>',
            '<div class="product-search-display" ng-class="{\'active\':displayProductSearch}">',
            '<div class="row" style="display: flex;justify-content: center;">',
            '<div class="col-xs-10 col-md-6">',
            '<form name="productSearchInput" ng-submit="executeSearch()">',
            '<div class="view-form-icon">',
            '<div class="input-group" style="margin:0;">',
            '<input type="text" class="form-control" placeholder="{{\'Search\' | r}} {{\'Products\' | r}}" ng-model="productSearchTerm"/>',
            // '<i class="fa fa-search"></i>',
            '<span class="input-group-btn">',
            '<button type="submit" class="btn btn-default searchButton" ng-disabled="productSearchTerm == null || productSearchTerm == \'\'"><i class="fa fa-search"></i></button>',
            '</span>',
            '</div>',
            '</div>',
            '</form>',
            '</div>',
            '<div class="col-xs-2 col-md-1 text-center">',
            '<i class="fa fa-times" ng-click="displayProductSearch = false" style="font-size: 25px;padding-top: 8px;color: rgb(0, 38, 62);"></i>',
            '</div>',
            '</div>',
            '</div>',
            '<ul class="nav navbar-nav pull-right">',
            '<li class="search-toggle">',
            '<a class="nav-link" href ng-click="displayProductSearch = true;">',
            '<i class="fa fa-search"></i>',
            '</a>',
            '</li>',
            '</ul>'
        ].join('');
    }
}

ProductSearchInputCtrl.$inject = ['$scope','$location'];
function ProductSearchInputCtrl($scope, $location) {
    $scope.displayProductSearch = false;
    $scope.executeSearch = function() {
        var searchTerm = $scope.productSearchTerm;
        $scope.productSearchTerm = null;
        $scope.displayProductSearch = false;
        $location.path('search/' + searchTerm);
    };
}
