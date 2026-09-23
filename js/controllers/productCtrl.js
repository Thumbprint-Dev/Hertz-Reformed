four51.app.controller('ProductCtrl', ['$scope', '$routeParams', '$route', '$location', '$451', 'Nav', 'Product', 'ProductDisplayService', 'Order', 'Variant', 'User',
  function($scope, $routeParams, $route, $location, $451, Nav, Product, ProductDisplayService, Order, Variant, User) {
    // Same guard, same reason as cartCtrl.js. See the note there.
    $scope.isEditforApproval = $routeParams.orderID && $scope.user && $scope.user.Permissions.contains('EditApprovalOrder');
    if ($scope.isEditforApproval) {
      Order.get($routeParams.orderID, function(order) {
        $scope.currentOrder = order;
      });
    }

    // panel-nav
    $scope.navStatus = Nav.status;
    //default the category panel to be collapsed
    $scope.navStatus.visible = false;

    $scope.toggleNav = Nav.toggle;

    $scope.searchTerm = $routeParams.searchTerm;
    console.log('string routeParams ', $routeParams);
    // $scope.search = Search;

    // ----

    /* Custom Logic Preventing a Mixed Cart */
    $scope.CartContainsCustomShipperProduct = false;
    $scope.productapp = false;
    $scope.cartapparel = false;
    $scope.ProductHasCustomShipper = false;

    if ($scope.currentOrder && $scope.currentOrder.LineItems) {
      angular.forEach($scope.currentOrder.LineItems, function(item) {
        if (item.Product.StaticSpecGroups && item.Product.StaticSpecGroups.isapparel !== undefined) {
          if (item.Product.StaticSpecGroups.isapparel.Specs['Item'].Value === 'true') {
            $scope.cartapparel = true;
            $scope.CartContainsCustomShipperProduct = true;
          }
        }
      });
    }
    $scope.$watch('LineItem.Product', function(newVal) {
      if (!newVal) return;
      if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.stackedLogo !== undefined) {
        if ($scope.LineItem.Product.StaticSpecGroups.stackedLogo.Specs['Item'].Value === 'true') {
          $scope.productapp = true;
          $scope.ProductHasCustomShipper = true;
        }
      }
      $scope.allowProductToBeAdded = (($scope.cartapparel || !$scope.currentOrder) && $scope.productapp) ||
        (!$scope.cartapparel && !$scope.productapp);
    });

    // hide price spec

    $scope.CartContainsCustomShipperProductPrice = false;
    $scope.productappPrice = false;
    $scope.cartapparelPrice = false;
    $scope.ProductHasCustomShipperPrice = false;

    if ($scope.currentOrder && $scope.currentOrder.LineItems) {
      angular.forEach($scope.currentOrder.LineItems, function(item) {
        if (item.Product.StaticSpecGroups && item.Product.StaticSpecGroups.HidePrice !== undefined) {
          if (item.Product.StaticSpecGroups.HidePrice.Specs['Item'].Value === 'true') {
            $scope.cartapparelPrice = true;
            $scope.CartContainsCustomShipperProductPrice = true;
          }
        }
      });
    }
    $scope.$watch('LineItem.Product', function(newVal) {
      if (!newVal) return;
      if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.HidePrice !== undefined) {
        if ($scope.LineItem.Product.StaticSpecGroups.HidePrice.Specs['Item'].Value === 'true') {
          $scope.productappPrice = true;
          $scope.ProductHasCustomShipperPrice = true;
        }
      }
      $scope.allowProductToBeAddedPrice = (($scope.cartapparelPrice || !$scope.currentOrder) && $scope.productappPrice) ||
        (!$scope.cartapparelPrice && !$scope.productappPrice);
    });

    var stackedLogoItem = false;

    $scope.$watch('LineItem.Product', function(newVal) {
      if (!newVal) return;
      if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.stackedLogo !== undefined) {
        if ($scope.LineItem.Product.StaticSpecGroups.stackedLogo.Specs['Item'].Value === 'true') {
          stackedLogoItem = true;
        } else {
          stackedLogoItem = false;
        }
      } else {
        stackedLogoItem = false;
      }
      $scope.stackedLogoItem = stackedLogoItem;
    });
    
    
$scope.CartContainsCustomShipperProductSpring = false;
$scope.productappSpring = false;
$scope.cartapparelSpring = false;
$scope.ProductHasCustomShipperSpring = false;

if ($scope.currentOrder && $scope.currentOrder.LineItems) {
  angular.forEach($scope.currentOrder.LineItems, function(item) {
	if (item.Product.StaticSpecGroups && item.Product.StaticSpecGroups.springC2025 !== undefined) {
	  if (item.Product.StaticSpecGroups.springC2025.Specs['Item'].Value === 'true') {
		$scope.cartapparelSpring = true;
		$scope.CartContainsCustomShipperProductSpring = true;
	  }
	}
  });
}
$scope.$watch('LineItem.Product', function(newVal) {
  if (!newVal) return;
  if ($scope.LineItem.Product.StaticSpecGroups && $scope.LineItem.Product.StaticSpecGroups.springC2025 !== undefined) {
	if ($scope.LineItem.Product.StaticSpecGroups.springC2025.Specs['Item'].Value === 'true') {
	  $scope.productappSpring = true;
	  $scope.ProductHasCustomShipperSpring = true;
	}
  }
  $scope.allowProductToBeAddedPrice = (($scope.cartapparelSpring || !$scope.currentOrder) && $scope.productappSpring) ||
	(!$scope.cartapparelSpring && !$scope.productappSpring);
});
    
    

    $scope.colorValue = null;
    $scope.interopID = null;
    
    $scope.$watch('LineItem.Product', function(newProduct, oldProduct) {
        if (!newProduct) return;
        // Watch and update Color value
        if (newProduct.Specs && newProduct.Specs.Color) {
            const color = newProduct.Specs.Color.Value || null;
            if (color !== $scope.colorValue) {
                $scope.colorValue = color; // Update scope variable
                console.log('Updated Color Value:', $scope.colorValue);
            }
        }
        // Watch and update InteropID
        if (newProduct.InteropID) {
            if (newProduct.InteropID !== $scope.interopID) {
                $scope.interopID = newProduct.InteropID;
                console.log('Updated InteropID:', $scope.interopID);
            }
        }
    }, true);
    
    
    $scope.LocationURLs = {
        "Thompson Thrift Logo": "https://thumbprint.com/Thompson-Thrift/Logos/Thompson_Thrift_Logo_Horizontal_White_.eps",
        "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryHorizontal_White.eps",
        "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Horizontal_White.eps",
        "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Horizontal_White_Solid.eps",
		"Alta25": "https://thumbprint.com/Thompson-Thrift/Logos/Alta25_Primary_Horizontal_White.eps",
		"Boardwalk at Tradition": "https://thumbprint.com/Thompson-Thrift/Logos/BoardwalkatTradition_Primary_Horizontal_White.eps",
		"Canter": "https://thumbprint.com/Thompson-Thrift/Logos/Canter_Primary_Horizontal_White.eps",
		"Drift": "https://thumbprint.com/Thompson-Thrift/Logos/Drift_Primary_Horizontal_1Color_White.eps",
		"Watermark at Steele Crossing": "https://thumbprint.com/Thompson-Thrift/Logos/Fayetteville_SteeleCrossing_horiz_White.eps",
		"The Meridian at CityPlace": "https://thumbprint.com/Thompson-Thrift/Logos/MeridianAtCityPlace_Primary_Horizontal_White.eps",
		"Notch66": "https://thumbprint.com/Thompson-Thrift/Logos/Notch66_Primary_Horizontal_White.eps",
		"Palm Grove Luxury Apartment Homes": "https://thumbprint.com/Thompson-Thrift/Logos/PalmGrove_Primary_Horizontal_White.eps",
		"Premier at West Park": "https://thumbprint.com/Thompson-Thrift/Logos/PremierAtWestPark_Primary_Horizontal_White.eps",
		"Prism at Diamond Ridge": "https://thumbprint.com/Thompson-Thrift/Logos/Prism_Primary_Horizontal_White.eps",
		"Refinery at Pointe 17": "https://thumbprint.com/Thompson-Thrift/Logos/RefineryAtPointe17_Primary_Horizontal_White.eps",
		"Slate at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/Slate_Primary_Horizontal_White.eps",
		"Standard441": "https://thumbprint.com/Thompson-Thrift/Logos/Standard441_Primary_Horizontal_White.eps",
		"Switch": "https://thumbprint.com/Thompson-Thrift/Logos/Switch_Primary_Horizontal_White.eps",
		"Terrassa": "https://thumbprint.com/Thompson-Thrift/Logos/Terrassa_Primary_Horizontal_White.eps",
		"The BLVD at Wilson Crossings": "https://thumbprint.com/Thompson-Thrift/Logos/TheBLVD_Primary_Horizontal_White.eps",
		"The Concord": "https://thumbprint.com/Thompson-Thrift/Logos/TheConcord_Primary_Horizontal_White.eps",
		"The Depot": "https://thumbprint.com/Thompson-Thrift/Logos/TheDepot_Primary_Horizontal_White.eps",
		"The Garrison": "https://thumbprint.com/Thompson-Thrift/Logos/TheGarrison_Primary_Horizontal_White.eps",
		"The Hadley": "https://thumbprint.com/Thompson-Thrift/Logos/TheHadley_Primary_Horizontal_White.eps",
		"The Junction at Rockledge": "https://thumbprint.com/Thompson-Thrift/Logos/TheJunction_Primary_Horizontal_White.eps",
		"The Levi": "https://thumbprint.com/Thompson-Thrift/Logos/TheLevi_Primary_Horizontal_White.eps",
		"The Liliana": "https://thumbprint.com/Thompson-Thrift/Logos/TheLiliana_Primary_Horizontal_White.eps",
		"The Pullman": "https://thumbprint.com/Thompson-Thrift/Logos/ThePullman_Primary_Horizontal_White.eps",
		"The Quinn": "https://thumbprint.com/Thompson-Thrift/Logos/TheQuinn_Primary_Horizontal_White.eps",
		"The Sophia": "https://thumbprint.com/Thompson-Thrift/Logos/TheSophia_Primary_Horizontal_White.eps",
		"Union Flats at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/TheUnionFlats_Primary_Horizontal_White.eps",
		"Upland Flats": "https://thumbprint.com/Thompson-Thrift/Logos/UplandFlats_Primary_Horizontal_White.eps",
		"Watermark at Twenty Mile": "https://thumbprint.com/Thompson-Thrift/Logos/TwentyMile_Primary_Horizontal_White.eps",
		"Watermark at Urban Blu": "https://thumbprint.com/Thompson-Thrift/Logos/UrbanBlu_Primary_Horizontal_White.eps",
		"Verity": "https://thumbprint.com/Thompson-Thrift/Logos/Verity_Primary_Horizontal_White.eps",
    };
    $scope.blackLocationURLs = {
        "Thompson Thrift Logo": "https://thumbprint.com/Thompson-Thrift/Logos/Thompson_Thrift_Logo_Horizontal_Black_.eps",
        "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryHorizontal_Black.eps",
        "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Horizontal_Black.eps",
        "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Horizontal_Black_Solid.eps",
		"Alta25": "https://thumbprint.com/Thompson-Thrift/Logos/Alta25_Primary_Horizontal_Black.eps",
		"Boardwalk at Tradition": "https://thumbprint.com/Thompson-Thrift/Logos/BoardwalkatTradition_Primary_Horizontal_Black.eps",
		"Canter": "https://thumbprint.com/Thompson-Thrift/Logos/Canter_Primary_Horizontal_Black.eps",
		"Drift": "https://thumbprint.com/Thompson-Thrift/Logos/Drift_Primary_Horizontal_1Color_Black.eps",
		"Watermark at Steele Crossing": "https://thumbprint.com/Thompson-Thrift/Logos/Fayetteville_SteeleCrossing_horiz_Black.eps",
		"The Meridian at CityPlace": "https://thumbprint.com/Thompson-Thrift/Logos/MeridianAtCityPlace_Primary_Horizontal_Black.eps",
		"Notch66": "https://thumbprint.com/Thompson-Thrift/Logos/Notch66_Primary_Horizontal_Black.eps",
		"Palm Grove Luxury Apartment Homes": "https://thumbprint.com/Thompson-Thrift/Logos/PalmGrove_Primary_Horizontal_Black.eps",
		"Premier at West Park": "https://thumbprint.com/Thompson-Thrift/Logos/PremierAtWestPark_Primary_Horizontal_Black.eps",
		"Prism at Diamond Ridge": "https://thumbprint.com/Thompson-Thrift/Logos/Prism_Primary_Horizontal_Black.eps",
		"Refinery at Pointe 17": "https://thumbprint.com/Thompson-Thrift/Logos/RefineryAtPointe17_Primary_Horizontal_Black.eps",
		"Slate at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/Slate_Primary_Horizontal_Black.eps",
		"Standard441": "https://thumbprint.com/Thompson-Thrift/Logos/Standard441_Primary_Horizontal_Black.eps",
		"Switch": "https://thumbprint.com/Thompson-Thrift/Logos/Switch_Primary_Horizontal_Black.eps",
		"Terrassa": "https://thumbprint.com/Thompson-Thrift/Logos/Terrassa_Primary_Horizontal_Black.eps",
		"The BLVD at Wilson Crossings": "https://thumbprint.com/Thompson-Thrift/Logos/TheBLVD_Primary_Horizontal_Black.eps",
		"The Concord": "https://thumbprint.com/Thompson-Thrift/Logos/TheConcord_Primary_Horizontal_Black.eps",
		"The Depot": "https://thumbprint.com/Thompson-Thrift/Logos/TheDepot_Primary_Horizontal_Black.eps",
		"The Garrison": "https://thumbprint.com/Thompson-Thrift/Logos/TheGarrison_Primary_Horizontal_Black.eps",
		"The Hadley": "https://thumbprint.com/Thompson-Thrift/Logos/TheHadley_Primary_Horizontal_Black.eps",
		"The Junction at Rockledge": "https://thumbprint.com/Thompson-Thrift/Logos/TheJunction_Primary_Horizontal_Black.eps",
		"The Levi": "https://thumbprint.com/Thompson-Thrift/Logos/TheLevi_Primary_Horizontal_Black.eps",
		"The Liliana": "https://thumbprint.com/Thompson-Thrift/Logos/TheLiliana_Primary_Horizontal_Black.eps",
		"The Pullman": "https://thumbprint.com/Thompson-Thrift/Logos/ThePullman_Primary_Horizontal_Black.eps",
		"The Quinn": "https://thumbprint.com/Thompson-Thrift/Logos/TheQuinn_Primary_Horizontal_Black.eps",
		"The Sophia": "https://thumbprint.com/Thompson-Thrift/Logos/TheSophia_Primary_Horizontal_Black.eps",
		"Union Flats at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/TheUnionFlats_Primary_Horizontal_Black.eps",
		"Upland Flats": "https://thumbprint.com/Thompson-Thrift/Logos/UplandFlats_Primary_Horizontal_Black.eps",
		"Watermark at Twenty Mile": "https://thumbprint.com/Thompson-Thrift/Logos/TwentyMile_Primary_Horizontal_Black.eps",
		"Watermark at Urban Blu": "https://thumbprint.com/Thompson-Thrift/Logos/UrbanBlu_Primary_Horizontal_Black.eps",
		"Verity": "https://thumbprint.com/Thompson-Thrift/Logos/Verity_Primary_Horizontal_Black.eps",
    };

    $scope.LocationStackedURLs = {
      "Thompson Thrift Logo": "https://thumbprint.com/Thompson-Thrift/Logos/Thompson_Thrift_Logo_Vertical_White.eps",
      "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryVertical_White.eps",
      "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Vertical_White.eps",
      "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Vertical_White_Solid.eps",
	  "Alta25": "https://thumbprint.com/Thompson-Thrift/Logos/Alta25_Primary_Vertical_White.eps",
	  "Boardwalk at Tradition": "https://thumbprint.com/Thompson-Thrift/Logos/BoardwalkatTradition_Primary_Vertical_White.eps",
	  "Canter": "https://thumbprint.com/Thompson-Thrift/Logos/Canter_Primary_Vertical_White.eps",
	  "Drift": "https://thumbprint.com/Thompson-Thrift/Logos/Drift_Primary_Vertical_1Color_White.eps",
	  "Watermark at Harvest Junction": "https://thumbprint.com/Thompson-Thrift/Logos/HarvestJunction_Primary_Horizontal_White.eps",
	  "Lift @ The Gilmore": "https://thumbprint.com/Thompson-Thrift/Logos/LiftAtTheGilmore_PrimaryVertical_White.eps",
	  "The Meridian at CityPlace": "https://thumbprint.com/Thompson-Thrift/Logos/MeridianAtCityPlace_Primary_Vertical_White.eps",
	  "Notch66": "https://thumbprint.com/Thompson-Thrift/Logos/Notch66_Primary_Vertical_White.eps",
	  "Palm Grove Luxury Apartment Homes": "https://thumbprint.com/Thompson-Thrift/Logos/PalmGrove_Primary_Vertical_White.eps",
	  "Prism at Diamond Ridge": "https://thumbprint.com/Thompson-Thrift/Logos/Prism_Primary_Vertical_White.eps",
	  "Refinery at Pointe 17": "https://thumbprint.com/Thompson-Thrift/Logos/RefineryAtPointe17_Primary_Vertical_White.eps",
	  "Slate at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/Slate_Primary_Vertical_White.eps",
	  "Standard441": "https://thumbprint.com/Thompson-Thrift/Logos/Standard441_Primary_Vertical_White.eps",
	  "Switch": "https://thumbprint.com/Thompson-Thrift/Logos/Switch_Primary_Vertical_White.eps",
	  "Terrassa": "https://thumbprint.com/Thompson-Thrift/Logos/Terrassa_Primary_Vertical_White.eps",
	  "The BLVD at Wilson Crossings": "https://thumbprint.com/Thompson-Thrift/Logos/TheBLVD_Primary_Vertical_White.eps",
	  "The Concord": "https://thumbprint.com/Thompson-Thrift/Logos/TheConcord_Primary_Vertical_White.eps",
	  "The Depot": "https://thumbprint.com/Thompson-Thrift/Logos/TheDepot_Primary_Vertical_White.eps",
	  "The Hadley": "https://thumbprint.com/Thompson-Thrift/Logos/TheHadley_Primary_Vertical_White.eps",
	  "The Junction at Rockledge": "https://thumbprint.com/Thompson-Thrift/Logos/TheJunction_Primary_Vertical_White.eps",
	  "The Levi": "https://thumbprint.com/Thompson-Thrift/Logos/TheLevi_Primary_Vertical_White.eps",
	  "The Liliana": "https://thumbprint.com/Thompson-Thrift/Logos/TheLiliana_Primary_Vertical_White.eps",
	  "The Pullman": "https://thumbprint.com/Thompson-Thrift/Logos/ThePullman_Primary_Vertical_White.eps",
	  "The Quinn": "https://thumbprint.com/Thompson-Thrift/Logos/TheQuinn_Primary_Vertical_White.eps",
	  "The Sophia": "https://thumbprint.com/Thompson-Thrift/Logos/TheSophia_Primary_Vertical_White.eps",
	  "Union Flats at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/TheUnionFlats_Primary_Vertical_White.eps",
	  "Upland Flats": "https://thumbprint.com/Thompson-Thrift/Logos/UplandFlats_Primary_Vertical_White.eps",
	  "Watermark at Urban Blu": "https://thumbprint.com/Thompson-Thrift/Logos/UrbanBlu_Primary_Vertical_White.eps",
	  "Verity": "https://thumbprint.com/Thompson-Thrift/Logos/Verity_Primary_Vertical_White.eps",
   };
  $scope.blackLocationStackedURLs = {
      "Thompson Thrift Logo": "https://thumbprint.com/Thompson-Thrift/Logos/Thompson_Thrift_Logo_Vertical_Black.eps",
      "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryVertical_Black.eps",
      "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Vertical_Black.eps",
      "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Vertical_Black_Solid.eps",
	  "Alta25": "https://thumbprint.com/Thompson-Thrift/Logos/Alta25_Primary_Vertical_Black.eps",
	  "Boardwalk at Tradition": "https://thumbprint.com/Thompson-Thrift/Logos/BoardwalkatTradition_Primary_Vertical_Black.eps",
	  "Canter": "https://thumbprint.com/Thompson-Thrift/Logos/Canter_Primary_Vertical_Black.eps",
	  "Drift": "https://thumbprint.com/Thompson-Thrift/Logos/Drift_Primary_Vertical_1Color_Black.eps",
	  "Watermark at Harvest Junction": "https://thumbprint.com/Thompson-Thrift/Logos/HarvestJunction_Primary_Horizontal_Black.eps",
	  "Lift @ The Gilmore": "https://thumbprint.com/Thompson-Thrift/Logos/LiftAtTheGilmore_PrimaryVertical_Black.eps",
	  "The Meridian at CityPlace": "https://thumbprint.com/Thompson-Thrift/Logos/MeridianAtCityPlace_Primary_Vertical_Black.eps",
	  "Notch66": "https://thumbprint.com/Thompson-Thrift/Logos/Notch66_Primary_Vertical_Black.eps",
	  "Palm Grove Luxury Apartment Homes": "https://thumbprint.com/Thompson-Thrift/Logos/PalmGrove_Primary_Vertical_Black.eps",
	  "Prism at Diamond Ridge": "https://thumbprint.com/Thompson-Thrift/Logos/Prism_Primary_Vertical_Black.eps",
	  "Refinery at Pointe 17": "https://thumbprint.com/Thompson-Thrift/Logos/RefineryAtPointe17_Primary_Vertical_Black.eps",
	  "Slate at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/Slate_Primary_Vertical_Black.eps",
	  "Standard441": "https://thumbprint.com/Thompson-Thrift/Logos/Standard441_Primary_Vertical_Black.eps",
	  "Switch": "https://thumbprint.com/Thompson-Thrift/Logos/Switch_Primary_Vertical_Black.eps",
	  "Terrassa": "https://thumbprint.com/Thompson-Thrift/Logos/Terrassa_Primary_Vertical_Black.eps",
	  "The BLVD at Wilson Crossings": "https://thumbprint.com/Thompson-Thrift/Logos/TheBLVD_Primary_Vertical_Black.eps",
	  "The Concord": "https://thumbprint.com/Thompson-Thrift/Logos/TheConcord_Primary_Vertical_Black.eps",
	  "The Depot": "https://thumbprint.com/Thompson-Thrift/Logos/TheDepot_Primary_Vertical_Black.eps",
	  "The Hadley": "https://thumbprint.com/Thompson-Thrift/Logos/TheHadley_Primary_Vertical_Black.eps",
	  "The Junction at Rockledge": "https://thumbprint.com/Thompson-Thrift/Logos/TheJunction_Primary_Vertical_Black.eps",
	  "The Levi": "https://thumbprint.com/Thompson-Thrift/Logos/TheLevi_Primary_Vertical_Black.eps",
	  "The Liliana": "https://thumbprint.com/Thompson-Thrift/Logos/TheLiliana_Primary_Vertical_Black.eps",
	  "The Pullman": "https://thumbprint.com/Thompson-Thrift/Logos/ThePullman_Primary_Vertical_Black.eps",
	  "The Quinn": "https://thumbprint.com/Thompson-Thrift/Logos/TheQuinn_Primary_Vertical_Black.eps",
	  "The Sophia": "https://thumbprint.com/Thompson-Thrift/Logos/TheSophia_Primary_Vertical_Black.eps",
	  "Union Flats at Fishers District": "https://thumbprint.com/Thompson-Thrift/Logos/TheUnionFlats_Primary_Vertical_Black.eps",
	  "Upland Flats": "https://thumbprint.com/Thompson-Thrift/Logos/UplandFlats_Primary_Vertical_Black.eps",
	  "Watermark at Urban Blu": "https://thumbprint.com/Thompson-Thrift/Logos/UrbanBlu_Primary_Vertical_Black.eps",
	  "Verity": "https://thumbprint.com/Thompson-Thrift/Logos/Verity_Primary_Vertical_Black.eps",
  };
    
    $scope.$watch('LineItem.Product.Specs', function(newSpecs) {
        console.log('Inside Product Specs Watch:', newSpecs);
    
        angular.forEach(newSpecs, function(field) {
            if (field.Name === 'Location') {
                console.log('Field value:', field.Value);
    
                // Find the corresponding Logo_URL field
                angular.forEach(newSpecs, function(targetField) {
                    if (targetField.Name === 'Logo_URL') {
                        if ($scope.colorValue === null && !$scope.stackedLogoItem) {
                            targetField.Value = $scope.LocationURLs[field.Value] || null; 
                        } else if ($scope.colorValue !== 'White' && !$scope.stackedLogoItem) {
                            targetField.Value = $scope.LocationURLs[field.Value] || null;
                        } else if ($scope.colorValue === 'White' && !$scope.stackedLogoItem) {
                            targetField.Value = $scope.blackLocationURLs[field.Value] || null; 
                        } else if ($scope.colorValue !== 'White' && $scope.stackedLogoItem) {
                          targetField.Value = $scope.LocationStackedURLs[field.Value] || null; 
                        } else if ($scope.colorValue === 'White' && $scope.stackedLogoItem) {
                          targetField.Value = $scope.blackLocationStackedURLs[field.Value] || null; 
                        } 
                    }
                });
            }
        });
    }, true);
  
    



  //   $scope.whiteLocationURLs = {
  //       "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryHorizontal_White.eps",
  //       "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Horizontal_White.eps",
  //       "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Horizontal_White_Solid.eps"
  //   };
  //   $scope.blackLocationURLs = {
  //     "The Maddox": "https://thumbprint.com/Thompson-Thrift/Logos/TheMaddox_PrimaryHorizontal_Black.eps",
  //     "Grandstone at Sunrise": "https://thumbprint.com/Thompson-Thrift/Logos/Grandstone_Primary_Horizontal_Black.eps",
  //     "Stella": "https://thumbprint.com/Thompson-Thrift/Logos/Stella_Primary_Horizontal_Black_Solid.eps"
  // };
    
  //   $scope.$watch('LineItem.Product.Specs', function(newSpecs) {
  //       console.log('inside Product Specs Watch', newSpecs);
    
  //       angular.forEach(newSpecs, function(field) {
  //           if (field.Name === 'Location') {
  //               console.log('field value', field.Value);
    
  //               // Find the corresponding Logo_URL field
  //               angular.forEach(newSpecs, function(targetField) {
  //                   if (targetField.Name === 'Logo_URL' && colorValue != 'White') {
  //                       targetField.Value = $scope.whiteLocationURLs[field.Value] || null; 
  //                   } else if (targetField.Name === 'Logo_URL' && colorValue === 'White') {
  //                       targetField.Value = $scope.blackLocationURLs[field.Value] || null; 
  //                   }
  //               });
  //           }
  //       });
  //   }, true);
  
  
      //End Custom Logic

    $scope.selected = 1;
    $scope.LineItem = {};
    $scope.addToOrderText = "Add To Cart";
    $scope.loadingIndicator = true;
    $scope.loadingImage = true;
    $scope.searchTerm = null;
    $scope.settings = {
      currentPage: 1,
      pageSize: 10
    };

    $scope.calcVariantLineItems = function(i) {
      $scope.variantLineItemsOrderTotal = 0;
      angular.forEach($scope.variantLineItems, function(item) {
        $scope.variantLineItemsOrderTotal += item.LineTotal || 0;
      })
    };

    function setDefaultQty(lineitem) {
      if (lineitem.PriceSchedule && lineitem.PriceSchedule.DefaultQuantity != 0)
        $scope.LineItem.Quantity = lineitem.PriceSchedule.DefaultQuantity;
    }

    function init(searchTerm, callback) {
      ProductDisplayService.getProductAndVariant($routeParams.productInteropID, $routeParams.variantInteropID, function(data) {
        if (data.product.Type == 'Kit') {
          $location.path('/kit/' + data.product.InteropID);
        }
        $scope.LineItem.Product = data.product;
        $scope.LineItem.Variant = data.variant;
        ProductDisplayService.setNewLineItemScope($scope);
        ProductDisplayService.setProductViewScope($scope);
        setDefaultQty($scope.LineItem);
        $scope.$broadcast('ProductGetComplete');
        $scope.loadingIndicator = false;
        $scope.setAddToOrderErrors();
        if (angular.isFunction(callback))
          callback();
      }, $scope.settings.currentPage, $scope.settings.pageSize, searchTerm);
    }
    $scope.$watch('settings.currentPage', function(n, o) {
      if (n != o || (n == 1 && o == 1))
        init($scope.searchTerm);
    });

    $scope.searchVariants = function(searchTerm) {
      $scope.searchTerm = searchTerm;
      $scope.settings.currentPage == 1 ?
        init(searchTerm) :
        $scope.settings.currentPage = 1;
    };

    $scope.deleteVariant = function(v, redirect) {
      if (!v.IsMpowerVariant) return;
      // doing this because at times the variant is a large amount of data and not necessary to send all that.
      var d = {
        "ProductInteropID": $scope.LineItem.Product.InteropID,
        "InteropID": v.InteropID
      };
      Variant.delete(d,
        function() {
          redirect ? $location.path('/product/' + $scope.LineItem.Product.InteropID) : $route.reload();
        },
        function(ex) {
          if ($scope.lineItemErrors.indexOf(ex.Message) == -1) $scope.lineItemErrors.unshift(ex.Message);
          $scope.showAddToCartErrors = true;
        }
      );
    }


    $scope.addToOrder = function() {
    //   if ($scope.currentOrder !== null) {
    //     if ($scope.productappSpring === false && $scope.cartapparelSpring === true) {
    //       alert("This item can not be combined with other items.");
    //       $location.path('/cart');
    //       return;
    //     }

    //     if ($scope.productappSpring === true && $scope.cartapparelSpring === false) {
    //       alert("This item can not be combined with other items");
    //       $location.path('/cart');
    //       return;
    //     }
    //   }
      if ($scope.lineItemErrors && $scope.lineItemErrors.length) {
        $scope.showAddToCartErrors = true;
        return;
      }
      if (!$scope.currentOrder) {
        $scope.currentOrder = {};
        $scope.currentOrder.LineItems = [];
      }
      if (!$scope.currentOrder.LineItems)
        $scope.currentOrder.LineItems = [];

      // Check if desired product exceeds limits

      var types = {
        'TTH-KIT-CON': 'kit',
      }
      var counts = {
        kit: {
          count: 0,
          limit: 1
        },
      }
      angular.forEach($scope.currentOrder.LineItems, function(item) {
        console.log(item);
        if (types.hasOwnProperty(item.Product.InteropID)) {
          var productType = types[item.Product.InteropID];
          // Have to account for counts -- could be more than 1
          counts[productType].count += item.Quantity;
        }
      });
      if (($scope.conSpringUser === true || $scope.conOfficeSpringUser === true) && $scope.LineItem.Product.InteropID === 'TTH-KIT-CON') {
        console.log('counts', counts);
        var currentProductType = types[$scope.LineItem.Product.InteropID];
        if ((counts[currentProductType].count + parseInt($scope.LineItem.Quantity)) > counts[currentProductType].limit) {
          console.log('Order limit filled for:', currentProductType);
          alert('You hit your item limit of ' + counts[currentProductType].limit + ' for ' + currentProductType + ' products.');
          return;
        }
      }
      // --------

      if ($scope.allowAddFromVariantList) {
        angular.forEach($scope.variantLineItems, function(item) {
          if (item.Quantity > 0) {
            $scope.currentOrder.LineItems.push(item);
            $scope.currentOrder.Type = item.PriceSchedule.OrderType;
          }
        });
      } else {
        $scope.currentOrder.LineItems.push($scope.LineItem);
        $scope.currentOrder.Type = $scope.LineItem.PriceSchedule.OrderType;
      }
      $scope.addToOrderIndicator = true;
      //$scope.currentOrder.Type = (!$scope.LineItem.Product.IsVariantLevelInventory && $scope.variantLineItems) ? $scope.variantLineItems[$scope.LineItem.Product.Variants[0].InteropID].PriceSchedule.OrderType : $scope.LineItem.PriceSchedule.OrderType;
      // shipper rates are not recalcuated when a line item is added. clearing out the shipper to force new selection, like 1.0
      Order.clearshipping($scope.currentOrder).
      save($scope.currentOrder,
        function(o) {
          $scope.user.CurrentOrderID = o.ID;
          User.save($scope.user, function() {
            $scope.addToOrderIndicator = true;
            // $location.path('/cart' + ($scope.isEditforApproval ? '/' + o.ID : ''));
          });
        },
        function(ex) {
          //remove the last LineItem added to the cart.
          $scope.currentOrder.LineItems.pop();
          $scope.addToOrderIndicator = false;
          $scope.lineItemErrors.push(ex.Detail);
          $scope.showAddToCartErrors = true;
          //$route.reload();
        }
      );
       $scope.open(500);
    };

    $scope.setOrderType = function(type) {
      $scope.loadingIndicator = true;
      $scope.currentOrder = {
        'Type': type
      };
      init(null, function() {
        $scope.loadingIndicator = false;
      });
    };

    $scope.$on('event:imageLoaded', function(event, result) {
      $scope.loadingImage = false;
      $scope.$apply();
    });
  }
]);
