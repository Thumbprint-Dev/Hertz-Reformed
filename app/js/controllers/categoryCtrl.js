/// Sep 11th

four51.app.controller('CategoryCtrl', ['$routeParams', '$sce', '$scope', '$q', '$451', '$timeout', 'Order', 'Category', 'Product', 'Variant', 'Nav', '$modal', 'OrderSearchCriteria', 'User',
    function ($routeParams, $sce, $scope, $q, $451, $timeout, Order, Category, Product, Variant, Nav, $modal, OrderSearchCriteria, User) {
        $scope.productLoadingIndicator = true;
        $scope.settings = {
            currentPage: 1,
            pageSize: 100
        };
        $scope.trusted = function(d){
            if(d) return $sce.trustAsHtml(d);
        }
        
        console.log('CategoryCtrl');
        $scope.sizes = ['XS', 'S'];
        
        $scope.openOrderCount = 0;
        
        // Flag to prevent multiple add to cart clicks
        $scope.isAddingToCart = false;
        $scope.inventoryModalOpen = false;
        
        // Watch for changes to openOrderCount
        $scope.$watch('openOrderCount', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                $scope.openOrderCount = newVal; // Explicitly setting again, even though it already is
                console.log('openOrderCount changed from', oldVal, 'to', newVal);
                console.log('openOrderCount ', $scope.openOrderCount);
            }
        });
  
    $scope.cartHasItems = function () {
        return !!($scope.currentOrder &&
            angular.isArray($scope.currentOrder.LineItems) &&
            $scope.currentOrder.LineItems.length > 0);
    };
    
    // Flag to track if there are errors (prevents cart popup)
    $scope.hasInventoryErrors = false;
    
    // Helper function to format inventory errors from Order.save response
    var formatInventoryErrors = function(ex) {
      var errorMessages = [];
      
      // Check for error message
      if (ex.Message) {
        errorMessages.push(ex.Message);
      }
      
      // Check for Errors array
      if (ex.Errors && Array.isArray(ex.Errors)) {
        ex.Errors.forEach(function(error) {
          if (error.Message) {
            errorMessages.push(error.Message);
          } else if (typeof error === 'string') {
            errorMessages.push(error);
          }
        });
      }
      
      // Check for LineItems with errors
      if (ex.LineItems && Array.isArray(ex.LineItems)) {
        ex.LineItems.forEach(function(lineItem, index) {
          if (lineItem.Errors && Array.isArray(lineItem.Errors)) {
            lineItem.Errors.forEach(function(error) {
              var productName = lineItem.Product ? (lineItem.Product.Name || lineItem.Product.InteropID || 'Item ' + (index + 1)) : 'Item ' + (index + 1);
              var errorMsg = error.Message || error;
              
              // Extract size from InteropID if available
              var size = '';
              if (lineItem.Product && lineItem.Product.InteropID) {
                var parts = lineItem.Product.InteropID.split('-');
                if (parts.length > 0) {
                  size = parts[parts.length - 1];
                }
              }
              
              // Convert technical error messages to user-friendly format
              if (errorMsg.toLowerCase().indexOf('cannot exceed') > -1 || errorMsg.toLowerCase().indexOf('quantity available') > -1 || errorMsg.toLowerCase().indexOf('out of stock') > -1) {
                var friendlyMsg = 'The size you selected for "' + productName + '"';
                if (size) {
                  friendlyMsg += ' (Size: ' + size + ')';
                }
                friendlyMsg += ' is out of stock.';
                errorMessages.push(friendlyMsg);
              } else {
                errorMessages.push('The size you selected for "' + productName + '"' + (size ? ' (Size: ' + size + ')' : '') + ' is out of stock.');
              }
            });
          }
          // Check for qtyError on line item
          if (lineItem.qtyError) {
            var productName = lineItem.Product ? (lineItem.Product.Name || lineItem.Product.InteropID || 'Item ' + (index + 1)) : 'Item ' + (index + 1);
            
            // Extract size from InteropID if available
            var size = '';
            if (lineItem.Product && lineItem.Product.InteropID) {
              var parts = lineItem.Product.InteropID.split('-');
              if (parts.length > 0) {
                size = parts[parts.length - 1];
              }
            }
            
            // Convert technical error messages to user-friendly format
            var friendlyMsg = 'The size you selected for "' + productName + '"';
            if (size) {
              friendlyMsg += ' (Size: ' + size + ')';
            }
            friendlyMsg += ' is out of stock.';
            errorMessages.push(friendlyMsg);
          }
        });
      }
      
      // If no specific errors found, use the exception object itself
      if (errorMessages.length === 0) {
        if (ex.data && ex.data.Message) {
          errorMessages.push(ex.data.Message);
        } else if (typeof ex === 'string') {
          errorMessages.push(ex);
        } else {
          errorMessages.push('An error occurred while adding items to cart. Please check your selections and try again.');
        }
      }
      
      // Format as HTML list if multiple errors, otherwise return single message
      if (errorMessages.length > 1) {
        return '<strong>Out of Stock Items:</strong><ul style="margin-top: 10px; margin-bottom: 0;"><li>' + errorMessages.join('</li><li>') + '</li></ul>';
      } else {
        return errorMessages[0];
      }
    };
    
    // Function to show inventory errors in a modal popup
    var showInventoryErrorModal = function(errorMessage, allProducts, tempOrder, auto, successCallback) {
      // Prevent showing modal multiple times
      if ($scope.inventoryModalOpen) {
        console.log('Inventory modal already open, skipping duplicate modal');
        return;
      }
      
      $scope.hasInventoryErrors = true;
      $scope.inventoryModalOpen = true;
      
      // Inline template for the modal
      var modalTemplate = '<div class="modal-header" style="background-color: #d9534f; color: white; border-bottom: 2px solid #c9302c;">' +
        '<h3 class="modal-title" style="margin: 0; font-weight: bold;">' +
        '<i class="fa fa-exclamation-triangle" style="margin-right: 8px;"></i>Out of Stock' +
        '</h3>' +
        '</div>' +
        '<div class="modal-body" style="padding: 20px;">' +
        '<div class="alert alert-danger" style="border-left: 4px solid #d9534f; background-color: #f2dede; border-color: #ebccd1; color: #a94442; padding: 15px; margin-bottom: 20px;" ng-bind-html="errorMessage"></div>' +
        '<p style="margin-bottom: 15px; color: #333; line-height: 1.6;" ng-if="canContinue">' +
        'Some of the items you selected are currently out of stock. You have two options:' +
        '</p>' +
        '<p style="margin-bottom: 15px; color: #333; line-height: 1.6;" ng-if="!canContinue">' +
        'Some of the items you selected are currently out of stock. Please adjust your selections and try again.' +
        '</p>' +
        '<ul style="margin-bottom: 20px; padding-left: 20px; color: #333; line-height: 1.8;" ng-if="canContinue">' +
        '<li><strong>Change Selections:</strong> Close this window and select different sizes that are in stock.</li>' +
        '<li><strong>Continue Anyways:</strong> Add all items to your cart anyway. Out of stock items will be placed on backorder and shipped when available.</li>' +
        '</ul>' +
        '<p style="margin-bottom: 0; color: #666; font-size: 14px; line-height: 1.6; text-align: center;">' +
        '<i class="fa fa-envelope" style="margin-right: 5px; color: #d9534f;"></i>' +
        'If you have any questions or need assistance, please contact us at ' +
        '<a href="mailto:support@thumbprint.com" style="color: #d9534f; text-decoration: underline;">support@thumbprint.com</a>' +
        '</p>' +
        '</div>' +
        '<div class="modal-footer" style="border-top: 1px solid #e5e5e5; padding: 15px 20px; background-color: #f9f9f9; display: flex; justify-content: space-between;">' +
        '<button class="btn btn-primary" ng-click="changeSelection()" style="min-width: 150px; font-weight: bold; background-color: #d9534f; border-color: #d9534f; color: #fff;">' +
        '<i class="fa fa-arrow-left" style="margin-right: 5px;"></i>Change Selections' +
        '</button>' +
        '<button class="btn btn-primary" ng-click="continueAnyways()" ng-disabled="saving || !canContinue" ng-show="canContinue" style="min-width: 150px; font-weight: bold; background-color: #d9534f; border-color: #d9534f; color: #fff;">' +
        '<span ng-if="!saving">Continue Anyways<i class="fa fa-arrow-right" style="margin-left: 5px;"></i></span>' +
        '<span ng-if="saving"><i class="fa fa-spinner fa-spin" style="margin-right: 5px;"></i>Adding to Cart...</span>' +
        '</button>' +
        '<button class="btn btn-primary" ng-click="changeSelection()" ng-hide="canContinue" style="min-width: 150px; font-weight: bold; background-color: #d9534f; border-color: #d9534f; color: #fff;">OK</button>' +
        '</div>';
      
      var modalInstance = $modal.open({
        animation: $scope.animationsEnabled,
        template: modalTemplate,
        controller: 'InventoryErrorModalCtrl',
        backdrop: 'static',
        size: 'md',
        resolve: {
          errorMessage: function() {
            return errorMessage;
          },
          allProducts: function() {
            return allProducts;
          },
          tempOrder: function() {
            return tempOrder;
          },
          auto: function() {
            return auto;
          },
          successCallback: function() {
            return successCallback;
          },
          scope: function() {
            return $scope;
          },
          Order: function() {
            return Order;
          },
          User: function() {
            return User;
          },
          $location: ['$injector', function($injector) {
            return $injector.get('$location');
          }],
          $timeout: ['$injector', function($injector) {
            return $injector.get('$timeout');
          }]
        }
      });
      
      // Reset modal flag when modal is closed
      modalInstance.result.finally(function() {
        $scope.inventoryModalOpen = false;
        $scope.isAddingToCart = false; // Reset add to cart flag when modal closes
      });
      
      modalInstance.result.then(function(action) {
        // Modal closed
        $scope.hasInventoryErrors = false;
        if (action === 'continue') {
          // Items were saved, redirect will happen in modal controller
        }
      }, function() {
        // Modal dismissed (Change Selection), reset error flag
        $scope.hasInventoryErrors = false;
      });
    };
        
        OrderSearchCriteria.query(function(orders) {
            angular.forEach(orders, function(order) {
                if (order.DisplayName == "Open") {
                    $scope.openOrderCount = order.Count;
                }
            });
        });
        
        function createProductGroups(products) {
            // Need a list of top-level products, with associated sizes for each
            // e.g. HTZ-POL-TEST-XS (ultimate instead of TEST will have 001, 002, etc)
            // Inventory for each size, keyed by InteropID
            var groupedProducts = {};
  
            if (products && products.length) {
                for (var i=0; i < products.length; i++) {
                    var interopID = products[i].InteropID;
                    if (!interopID) {
                      console.log('Product without InteropID', products[i])
                      continue;
                  }
                  var parts = interopID.split('-');
                  var style = parts[2];
                  var size = parts[4];
                  if (!size) {
                      size = 'NOSIZE';
                  }
  
                  var baseInteropId = parts.slice(0, -1).join('-');
                //   console.log('baseInteropId', baseInteropId)
  
                  if (!groupedProducts.hasOwnProperty(baseInteropId)) {
                    groupedProducts[baseInteropId] = {
                        product: products[i],
                        inventory: {}
                    }
                }
                groupedProducts[baseInteropId]['inventory'][size] = products[i].QuantityAvailable;
            }
            console.log('groupedProducts', groupedProducts);
        }
        
        return groupedProducts;
    }
    
    var getProducts = function(d, category, page, pageSize) {
      console.log('getProducts 1', category, page, pageSize);
      // function(categoryInteropID, searchTerm, relatedProductsGroupID, success, page, pagesize)
            Product.search(category, null, null, function (catProducts, count) {
              console.log('getProducts 2', category, page, pageSize, count, catProducts);
              d.resolve(catProducts);
            }, page, pageSize);
    }
  
    var searchProductCategories = function(categories) {
      $scope.searchLoading = true;
    
      var queue3 = [];
    
      angular.forEach(categories, function(category) {
        // console.log('looping over categories', categories);
        queue3.push((function() {
          var d = $q.defer();
          Product.search(category, null, null, function (catProducts, count) {
            // console.log('category products', category, count, products);
            d.resolve(catProducts);
          }, $scope.settings.currentPage, $scope.settings.pageSize);
          return d.promise;
        })());
      });
    
      $q.all(queue3).then(function(results) {
        console.log('fetched all products', results);
        // flatten all product arrays into one list
        var merged = [];
        results.forEach(function (r) {
            merged = merged.concat(r);
        });
        $scope.products = merged;
        $scope.groupedProducts = createProductGroups($scope.products);
        console.log('^^^^', $scope.groupedProducts)
        // FIX: "count" is out of scope here
        $scope.productCount = $scope.products.length;
        $scope.productLoadingIndicator = false;
        $scope.searchLoading = false;
      });
    };
    
  
    function _search() {
      $scope.searchLoading = true;
    
    //   if ($routeParams.categoryInteropID) {
    //     let categories = [$routeParams.categoryInteropID];
    
    //     if ($scope.hertzUser && $scope.currentCategory.InteropID === 'htz_uniform') {
    //       categories.push('htz_bottoms', 'htz_tops1', 'htz_tops2', 'htz_layer', 'htz_outer', 'htz_bottoms2', 'htz_bottoms3');
  
    //     } else if ($scope.dollarUser) {
    //       categories.push('dt_bottoms', 'dt_tops', 'dt_layer', 'dt_outer', 'dt_bottoms2', 'dt_bottoms3');
    //     }
    
    //     searchProductCategories(categories);
    //     return;
    //   }
  
      function runCategorySearch() {
        if (!$routeParams.categoryInteropID) return;
      
        var categories = [$routeParams.categoryInteropID];
      
        var isHertzUniform =
          !!$scope.hertzUser &&
          $scope.currentCategory &&
          $scope.currentCategory.InteropID === 'htz_uniform';
      
        if (isHertzUniform) {
          categories.push(
          'htz_bottoms', 'htz_tops1', 'htz_tops2',
          'htz_layer', 'htz_outer', 'htz_bottoms2', 'htz_bottoms3'
          );
        } else if ($scope.dollarUser) {
          categories.push(
          'dt_bottoms', 'dt_tops',
          'dt_layer', 'dt_outer', 'dt_bottoms2', 'dt_bottoms3'
          );
        }
      
        searchProductCategories(categories);
      } // end runCategorySearch
  
      // If already loaded (e.g., soft nav), run immediately
      if ($routeParams.categoryInteropID && $scope.currentCategory) {
        runCategorySearch();
      } else if ($routeParams.categoryInteropID) {
      // Defer until currentCategory is set (typical on hard refresh)
        var unwatch = $scope.$watch('currentCategory', function(nv) {
          if (nv) {
            unwatch && unwatch();           // run once
            runCategorySearch();
          }
        });
      }
    
      $scope.searchLoading = true;
      Product.search(null, null, null, function (products, count) {
        console.log('search callback', count, products);
        $scope.products = products || [];
        $scope.groupedProducts = createProductGroups($scope.products);
        $scope.productCount = (typeof count === 'number') ? count : $scope.products.length;
        $scope.productLoadingIndicator = false;
        $scope.searchLoading = false;
      }, $scope.settings.currentPage, $scope.settings.pageSize);
    } // end _search
    
    /**
     * 
  function _search() {
        $scope.searchLoading = true;
        Product.search($routeParams.categoryInteropID, null, null, function (products, count) {
          console.log('search', count, products)
            $scope.products = products;
            $scope.groupedProducts = createProductGroups(products);
            $scope.productCount = count;
            $scope.productLoadingIndicator = false;
            $scope.searchLoading = false;
        }, $scope.settings.currentPage, $scope.settings.pageSize);
    }
     */
    
  
    function normalizeChoice(val) {
        if (!val) return '';
        if (typeof val === 'object') {
            return (val.Label || val.Name || val.Display || val.Value || '').toString().trim();
        }
        return val.toString().trim();
    }
    
        // --- Helper to fetch a field by Name ---
    function getFieldValueByName(fields, name) {
        if (!Array.isArray(fields)) return '';
        var match = fields.filter(function (f) { return f.Name === name; })[0];
        return normalizeChoice(match && match.Value);
    }
    
        // --- Single $watch that returns a primitive string to prevent infinite digest ---
    $scope.$watch(function () {
        var f = $scope.user && $scope.user.CustomFields;
        return [
            getFieldValueByName(f, 'Hertz_Choice_Bottom_1'),
            getFieldValueByName(f, 'Hertz_Choice_Bottom_2'),
            getFieldValueByName(f, 'Hertz_Choice_Bottom_3'),
            getFieldValueByName(f, 'Hertz_Choice_Bottom_4'),
            getFieldValueByName(f, 'Hertz_Choice_Bottom_5'),
            getFieldValueByName(f, 'Hertz_Choice_Bottom_6')
            ].join('|'); // <-- Always return a single primitive string
        }, function (joined) {
            var vals = joined.split('|');
            $scope.bottomChoiceOne   = vals[0] || '';
            $scope.bottomChoiceTwo   = vals[1] || '';
            $scope.bottomChoiceThree = vals[2] || '';
            $scope.bottomChoiceFour  = vals[3] || '';
            $scope.bottomChoiceFive  = vals[4] || '';
            $scope.bottomChoiceSix   = vals[5] || '';
            
            console.log('Choices:', {
                one:   $scope.bottomChoiceOne,
                two:   $scope.bottomChoiceTwo,
                three: $scope.bottomChoiceThree,
                four:  $scope.bottomChoiceFour,
                five:  $scope.bottomChoiceFive,
                six:   $scope.bottomChoiceSix
            });
        });
    
    
    $scope.animationsEnabled = true;
    
    $scope.openProductModal = function (li) {
        console.log('in function');
        var type = 'normal order';
        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'productModal.html',
            controller: 'productModalCtrl',
            backdrop: 'static',
            resolve: {
                lineitem: function () {
                    return li;
                },
                user: function () {
                    return $scope.user;
                },
                currentOrder: function () {
                    return $scope.currentOrder;
                },
                display: function() {
                    return type
                }
            }
        });
        modalInstance.result.then(function(o){
            $scope.currentOrder = o;
        });
    };
    
    $scope.$watch('settings.currentPage', function(n, o) {
        if (n != o || (n == 1 && o == 1))
            _search();
    });
    
    if ($routeParams.categoryInteropID) {
        $scope.categoryLoadingIndicator = true;
        Category.get($routeParams.categoryInteropID, function(cat) {
            $scope.currentCategory = cat;
            $scope.categoryLoadingIndicator = false;
        });
    }
    else if($scope.tree){
        $scope.currentCategory ={SubCategories:$scope.tree};
    }
    
    
    $scope.$on("treeComplete", function(data){
        if (!$routeParams.categoryInteropID) {
            $scope.currentCategory ={SubCategories:$scope.tree};
        }
    });
    
        // panel-nav
    $scope.navStatus = Nav.status;
        //default the category panel to be collapsed
    $scope.navStatus.visible = true;
    
    $scope.toggleNav = Nav.toggle;
    $scope.$watch('sort', function(s) {
        if (!s) return;
        (s.indexOf('Price') > -1) ?
        $scope.sorter = 'StandardPriceSchedule.PriceBreaks[0].Price' :
        $scope.sorter = s.replace(' DESC', "");
        $scope.direction = s.indexOf('DESC') > -1;
    });
  
  
    // Kit items to auto-add for uniform orders
    // (name tag HTZ-NAM-001 removed so it is no longer auto-added)
    // Hats and beanies are NO LONGER auto-added - they will only be added if user selects them from dropdown
      var chapterKitItems = [];
  
    // Hats and beanies removed from auto-add - they will only be added if user selects from dropdown
    // This prevents adding them to cart when user hasn't made a selection
    
      // No kit items currently require variant creation
      var variableProducts = [];
    
    var addKitItems = function(items) {
        $scope.displayLoadingIndicator = true;
        var queue1 = [];
        var products = [];
        
        angular.forEach(items, function(item) {
          console.log('looping over items', item);
          queue1.push((function() {
            var d = $q.defer();
            Product.get(item.id, function(data) {
              let variant = null;
              let productData = {
                product: data,
                qty: item.defaultQuantity
            };
            if (variableProducts.indexOf(item.id) >= 0) {
                console.log('Product with variant', item);
                variant = {};
                variant.ProductInteropID = data.InteropID;
                variant.Specs = {};
                angular.forEach(data.Specs, function(spec){
              // console.log('spec loop, spec=', spec)
                  if(!spec.CanSetForLineItem)
                  {
                    variant.Specs[spec.Name] = spec;
                }
            })
                Variant.save(variant, function(data){
              // console.log('saved variant');
              // Only resolve once variant is saved
                  productData.variant = data;
                  products.push(productData);
                  d.resolve();
              });
            } else {
            // Resolve with no variant
                products.push(productData);
                d.resolve();
            }
        });
            return d.promise;
        })());
      });
        
        if (!$scope.currentOrder) {
            $scope.currentOrder = {};
        }
        if (!$scope.currentOrder.LineItems) {
            $scope.currentOrder.LineItems = [];
        }
        
        $q.all(queue1).then(function() {
          // Store auto-added products but don't add them yet
          // We'll validate all items (auto + selected) together before adding any
          var autoAddedProducts = products;
          
          // Now proceed to get selected items and validate everything together
          addSelectedKitItems(function() {
            // Callback when all items are successfully added
            // Only open cart popup if no errors occurred
            $scope.isAddingToCart = false; // Reset flag on successful completion
            $timeout(function() {
              if (!$scope.hasInventoryErrors && $scope.open3) {
                $scope.open3(500);
              }
            }, 500);
          }, autoAddedProducts);
        });
    };
    
    // Take value from bag field, and add the selected product
    var addSelectedKitItems = function(successCallback, autoAddedProducts) {
      console.log('addSelectedKitItems');
      var customFields = $scope.user.CustomFields;
  
      // Build a quick lookup of any auto-added InteropIDs so we don't add duplicates
      // (e.g., reflective hat / beanie can be auto-added AND selected via dropdown fields)
      var autoAddedInteropIDs = {};
      if (autoAddedProducts && autoAddedProducts.length > 0) {
        angular.forEach(autoAddedProducts, function(p) {
          if (p && p.product && p.product.InteropID) {
            autoAddedInteropIDs[p.product.InteropID] = true;
          }
        });
      }
  
      // The UI dropdown values are just intger indexes, so map those to product InteropId bases
      var salesKitProducts = {
        "Men": "M",
        "Women": "W",
        "Mens Cargo Pants": "HTZ-CARGOPANT-M-UV",
        "Womens Modest Skirt": "HTZ-LSKIRT-W-UV",
        "Mens Performance Pant": "HTZ-PERFPANT-M-UV",
        "Womens Performance Pant": "HTZ-PERFPANT-W-UV",
        "Womens Cargo Pant": "HTZ-CARGOPANT-W-UV",
        "Mens Cargo Short": "HTZ-CARGOSHORT-M-UV",
        "Womens Cargo Short": "HTZ-CARGOSHORT-W-UV",
        "Hertz Mens 1/4 Zip Fleece": "HTZ-QTZIP-M-HZ",
        "Hertz Womens Full Zip Fleece": "HTZ-FLZIP-W-HZ",
        "Hertz Unisex Softshell w/Zip Off Sleeves": "HTZ-SSHELL-US-HZ",
        // IF You can make a different name for the Dollar dropdowns, then you should just be able to add the 3 outer layers
        "Dollar Thrifty Mens 1/4 Zip Fleece": "HTZ-QTZIP-M-DT",
        "Dollar Thrifty Womens Full Zip Fleece": "HTZ-FLZIP-W-DT",
        "Dollar Thrifty Unisex Softshell w/Zip Off Sleeves": "HTZ-SSHELL-US-DT",
        // TODO make sure these items actually work for Dollar
      };
  
      var productLookup = {
        "Hertz_Mens_Cargo_Pants": "HTZ-CARGOPANT-M-UV",
        "Hertz_Mens_Performance_Pants": "HTZ-PERFPANT-M-UV",
        "Hertz_Womens_Cargo_Pants": "HTZ-CARGOPANT-W-UV",
        "Hertz_Mens_Cargo_Shorts": "HTZ-CARGOSHORT-M-UV",
        "Hertz_Womens_Performance_Pants": "HTZ-PERFPANT-W-UV",
        "Hertz_Womens_Cargo_Shorts": "HTZ-CARGOSHORT-W-UV",
        "Hertz_Womens_Modest_Skirt": "HTZ-LSKIRT-W-UV",
      }
  
      var productMapping = {
        'Mens Cargo Pants': 'Hertz_Mens_Cargo_Pants',
        'Mens Performance Pants': 'Hertz_Mens_Performance_Pants',
        'Mens Cargo Shorts': 'Hertz_Mens_Cargo_Shorts',
        'Womens Cargo Pants': 'Hertz_Womens_Cargo_Pants',
        'Womens Performance Pants': 'Hertz_Womens_Performance_Pants',
        'Womens Cargo Shorts': 'Hertz_Womens_Cargo_Shorts',
        'Womens Modest Skirt': 'Hertz_Womens_Modest_Skirt',
  
        // 'Womens Cargo Shorts': 'Hertz_Choice_Layer_1',
        // 'Womens Modest Skirt': 'Hertz_Choice_Layer_2',
        // 'Womens Cargo Shorts': 'Dollar_Choice_Layer_2',
        // 'Womens Modest Skirt': 'Dollar_Choice_Layer_2',
      }
  
      // Keys are field names, values are InteropIDs
    var selectedProducts = {};
    
  // Iterate through custom fields to find the selected products
    angular.forEach(customFields, function(field) {
    //console.log('customFields field', field.Name, field.Value);
        if (field.Name.indexOf('Hertz_Choice') === 0 || field.Name.indexOf('Dollar_Choice') === 0) {
          angular.forEach(field.Options, function(option) {
            if (option.Selected) {
              console.log('~~~~~ customFields option', field.Name, option.Value);
              //if ((field.Name.indexOf('Hertz_Choice_Bottom') === 0) || (field.Name.indexOf('Hertz_Choice_Layer') === 0)) {
              if (field.Name.indexOf('Hertz_Choice_Bottom') === 0 || field.Name.indexOf('Dollar_Choice_Bottom') === 0) {
                var key = productMapping[option.Value];
                // console.log('**** key', key)
                if (!selectedProducts.hasOwnProperty(key)) {
                    selectedProducts[key] = 0;
                }
                selectedProducts[key]++;
              } else {
                selectedProducts[field.Name] = salesKitProducts[option.Value];
              }
            }
        });
      }
    });
    console.log('selectedProducts', selectedProducts);
    
    var queue = [];
    var products = [];
    
    // Iterate through custom fields again, to find the size and look up each product
    angular.forEach(customFields, function(field) {
        // console.log('customFields field', field.Name, field.Value);
  
        // Handle all size selection dropdowns and belts
        if (field.Name.indexOf('Size_Hertz') === 0 || field.Name.indexOf('Size_Dollar') === 0) {
          console.log('customFields size field name', field.Name);
  
          // Special handling for belt - check field.Value first, then options
          if (field.Name === 'Size_Hertz_Choice_Belt' || field.Name === 'Size_Dollar_Choice_Belt') {
            var beltSize = null;
            // Check if field has a direct value (some custom fields work this way)
            if (field.Value) {
              beltSize = field.Value;
              console.log('Belt size from field.Value:', beltSize);
            } else if (field.Options && field.Options.length > 0) {
              // Check selected options
              angular.forEach(field.Options, function(option) {
                if (option.Selected && !beltSize) {
                  beltSize = option.Value;
                  console.log('Belt size from option.Selected:', beltSize);
                }
              });
            }
            
            // Add belt if a size was found
            if (beltSize) {
              var interopIDs = [];
              interopIDs.push({
                  interopID: `HTZ-RFBLT-UV-${beltSize}`,
                  quantity: 1 
              });
              console.log('Adding belt to queue:', interopIDs[0].interopID);
              
              // Process the belt immediately
              angular.forEach(interopIDs, function(productInfo) {
                queue.push((function() {
                  var d = $q.defer();  
                  Product.get(productInfo.interopID, function(data) {
                    let productData = {
                      product: data,
                      quantity: productInfo.quantity
                    };
                    products.push(productData);
                    d.resolve();
                  });
                  return d.promise;
                })());
              });
            } else {
              console.log('WARNING: Belt field found but no size value detected. field.Value:', field.Value, 'field.Options:', field.Options);
            }
          }
  
          angular.forEach(field.Options, function(option) {
            //console.log('customFields option', option.InteropID, option.Value, option);
            if (option.Selected) {
              var key = field.Name.slice(5);
              var interopIDs = [];
                //console.log('key', key)
  
              // Skip belt here since it's handled above
              if (field.Name === 'Size_Hertz_Choice_Belt' || field.Name === 'Size_Dollar_Choice_Belt') {
                return; // Skip processing belt in the normal flow
              }
              else if (field.Name === 'Size_Hertz_Choice_Hat') {
                  // Hat doesn't have sizes, just use base SKU
                  var company = 'HZ';
                  if ($scope.dollarUser) {
                      company = 'DT';
                  }
                  var hatInteropID = `HTZ-RFHAT-${company}`;
                  // Prevent duplicates if hat already came from auto-added kit items
                  if (!autoAddedInteropIDs[hatInteropID]) {
                      autoAddedInteropIDs[hatInteropID] = true;
                      interopIDs.push({
                          interopID: hatInteropID,
                          quantity: 1
                      });
                  }
              }
              else if (field.Name === 'Size_Hertz_Choice_Beanie') {
                  // Beanie doesn't have sizes, just use base SKU
                  var company = 'HZ';
                  if ($scope.dollarUser) {
                      company = 'DT';
                  }
                  var beanieInteropID = `HTZ-BEANIE-${company}`;
                  // Prevent duplicates if beanie already came from auto-added kit items
                  if (!autoAddedInteropIDs[beanieInteropID]) {
                      autoAddedInteropIDs[beanieInteropID] = true;
                      interopIDs.push({
                          interopID: beanieInteropID,
                          quantity: 1
                      });
                  }
              }
              else if (field.Name === 'Size_Hertz_Choice_Top_SS') {
                var style = selectedProducts['Hertz_Choice_Top_Gender'];
                var ssQuantity = 2;
                if ($scope.fulltimeUser) {
                  ssQuantity = 3;
                } else if ($scope.laxUser) {
                  ssQuantity = 4;
                }
                var company = 'HZ'
                if ($scope.dollarUser) {
                  company = 'DT';
              }
                interopIDs.push({
                    interopID: `HTZ-POLOSS-${style}-${company}-${option.Value}`,
                    quantity: ssQuantity
                }); 
              }
              else if (field.Name === 'Size_Hertz_Choice_Top_LS') {
                    // Key will be "Hertz_Choice_Top_SS" or "Hertz_Choice_Top_LS" and value will be a size, like XS or M
                //   console.log('Adding tops')
                  // Add set number of long and short sleeve polos based on selected style (M or W)
                  // Full-Time 3 short sleeves and 2 long sleeve; fulltimeUser === true
                  // Part-Time 2 short sleeve and 1 long sleeve; partimeUser === true
                  // Lax 4 short sleeves and 2 long sleeve; laxUser === true
                    var style = selectedProducts['Hertz_Choice_Top_Gender'];
                    var lsQuantity = 1;
                    if ($scope.fulltimeUser) {
                      lsQuantity = 2;
                    } else if ($scope.laxUser) {
                      lsQuantity = 2;
                    }
                    var company = 'HZ'
                    if ($scope.dollarUser) {
                      company = 'DT';
                  }
  
                    interopIDs.push({
                        interopID: `HTZ-POLOLS-${style}-${company}-${option.Value}`,
                        quantity: lsQuantity 
                    }); 
  
                } else {
                // Append the selected size to the base InteropId to create a product InteropID
                    console.log('===> Adding other item')
                    var pInteropID = null;
                    var quantity = 1;
                    if (productLookup.hasOwnProperty(key)) {
                        console.log('getting quantity')
                        // This is a product where the sizes are specific to the item (e.g. pants), so we don't need to look up anything else to get the InteropID
                        var baseInteropId = productLookup[key];
                        // Get quantity based on number of times associated item was selected
                        // If quantity is undefined or 0, default to 1
                        quantity = selectedProducts[key];
                        if (!quantity || quantity === 0) {
                            quantity = 1;
                        }
                        pInteropID = `${baseInteropId}-${option.Value}`;
                    } else {
                        console.log('multiple dropdowns', key);
                        var baseInteropId = selectedProducts[key];
                        pInteropID = `${baseInteropId}-${option.Value}`;
                    }
  
                    interopIDs.push({
                        interopID: pInteropID,
                        quantity: quantity
                    }); 
                }
                // console.log('!!! interopIDs', interopIDs)
  
                angular.forEach(interopIDs, function(productInfo) {
                  queue.push((function() {
                    var d = $q.defer();  
                    // console.log('getting product', productInfo);
                    Product.get(productInfo.interopID, function(data) {
                    //   console.log('Got product', productInfo.quantity, data);
                      let productData = {
                        product: data,
                        quantity: productInfo.quantity
                      };
  
                    products.push(productData);
                    d.resolve();
                });
                    return d.promise;
                })());
              });
            }
  
        });
      }
  });
    
    $q.all(queue).then(function() {
        // Combine auto-added products with selected products
        var allProducts = [];
        
        // Add auto-added products if provided
        if (autoAddedProducts && autoAddedProducts.length > 0) {
          angular.forEach(autoAddedProducts, function(prod) {
            allProducts.push({
              product: prod.product,
              quantity: prod.qty,
              variant: prod.variant
            });
          });
        }
        
        // Add selected products
        angular.forEach(products, function(prod) {
          allProducts.push({
            product: prod.product,
            quantity: prod.quantity,
            variant: null
          });
        });
        
        var tempOrder = angular.copy($scope.currentOrder);
        var inventoryErrors = [];
        
        // Validate ALL items (auto + selected) together before adding any
        angular.forEach(allProducts, function(prod) {
            console.log('product', prod.product.InteropID, prod.quantity)
            
            // Pre-validate inventory before adding to order
            var product = prod.product;
            var quantity = prod.quantity;
            var qtyAvailable = product.QuantityAvailable || 0;
            
            // Check if product has inventory restrictions and quantity exceeds available
            if (product && qtyAvailable < quantity) {
              var productName = product.Name || product.InteropID || 'Unknown Product';
              
              // Extract size from InteropID (format: HTZ-POLOSS-M-HZ-XS, size is last part)
              var size = '';
              if (product.InteropID) {
                var parts = product.InteropID.split('-');
                if (parts.length > 0) {
                  size = parts[parts.length - 1];
                }
              }
              
              // Create user-friendly error message
              var errorMsg = 'The size you selected for "' + productName + '"';
              if (size) {
                errorMsg += ' (Size: ' + size + ')';
              }
              errorMsg += ' is out of stock.';
              
              inventoryErrors.push(errorMsg);
            }
        });
        
        // If pre-validation found inventory errors, display them and give user options
        if (inventoryErrors.length > 0) {
          $scope.displayLoadingIndicator = false;
          var errorMsg = inventoryErrors.length > 1 
            ? '<strong>Out of Stock Items:</strong><ul style="margin-top: 10px; margin-bottom: 0;"><li>' + inventoryErrors.join('</li><li>') + '</li></ul>'
            : inventoryErrors[0];
          
          // Prepare order with all items (even out of stock ones) for "Continue Anyways" option
          var tempOrderWithItems = angular.copy($scope.currentOrder);
          angular.forEach(allProducts, function(prod) {
            var tempLineItem = {
              Product: prod.product,
              Quantity: prod.quantity,
              ShipAccount: null,
              ShipAddressID: null,
              ShipFirstName: null,
              ShipLastName: null,
              Shipper: null,
              ShipperID: null,
              ShipperName: null,
              Variant: prod.variant
            };
            tempOrderWithItems.LineItems.push(tempLineItem);
          });
          
          var auto = $scope.currentOrder.autoID;
          // Show error in modal popup with data needed to save if user chooses "Continue Anyways"
          showInventoryErrorModal(errorMsg, allProducts, tempOrderWithItems, auto, successCallback);
          return; // Don't proceed with Order.save automatically - wait for user choice
        }
        
        // All items are valid, now add them all to the order
        angular.forEach(allProducts, function(prod) {
            // console.log('looping over products', prod);
            var tempLineItem = {
              Product: prod.product,
              Quantity: prod.quantity,
              ShipAccount: null,
              ShipAddressID: null, //$scope.orderShipAddress.ID,
              ShipFirstName: null,
              ShipLastName: null,
              Shipper: null,
              ShipperID: null,
              ShipperName: null,
              Variant: prod.variant
          };
          tempOrder.LineItems.push(tempLineItem);
      });
        
        $scope.errorMessage = null;
        $scope.actionMessage = null;
        
        var auto = $scope.currentOrder.autoID;
        console.log('about to save order', tempOrder.ID, tempOrder.LineItems);
        
        Order.save(tempOrder,
            function(data) {
              console.log('saved order', data.ID, data.LineItems)
              $scope.currentOrder = data;
              if (auto) {
                $scope.currentOrder.autoID = true;
                $scope.currentOrder.ExternalID = 'auto';
            }
            $scope.user.CurrentOrderID = data.ID;
            User.save($scope.user, function() {
                $scope.displayLoadingIndicator = false;
                $scope.isAddingToCart = false; // Reset flag on successful save
                
                // Call success callback if provided
                if (successCallback && typeof successCallback === 'function') {
                  successCallback();
                }
            });
            
        },
        function(ex) {
          $scope.currentOrder.ExternalID = null;
          var errorMsg = formatInventoryErrors(ex);
          console.log('Order.save error:', ex);
          $scope.displayLoadingIndicator = false;
          $scope.shippingUpdatingIndicator = false;
          $scope.shippingFetchIndicator = false;
          // Show error in modal popup - but we don't have the products here
          // In this case, user can only close and try again (no "Continue Anyways" option)
          // Note: isAddingToCart flag will be reset when modal closes
          showInventoryErrorModal(errorMsg, null, null, null, null);
      }
      );
    })
    
  };
  
  // end of kit items
  
  //save
  $scope.save = function() {
    // Prevent multiple clicks - return early if already processing
    if ($scope.isAddingToCart) {
      console.log('Add to cart already in progress, ignoring duplicate click');
      return;
    }
    
    // Set flag to prevent multiple clicks
    $scope.isAddingToCart = true;
    
    $scope.actionMessage = null;
    $scope.securityWarning = false;
    $scope.user.Username = $scope.user.TempUsername;
    $scope.displayLoadingIndicator = true;
    if ($scope.user.Type == 'TempCustomer')
      $scope.user.ConvertFromTempUser = true;
  
    // console.log('User form updated');
  
  User.save($scope.user,
      function(u) {
        $scope.securityWarning = false;
        $scope.displayLoadingIndicator = false;
        $scope.user.TempUsername = u.Username;
      //   if (_AnonRouter && !$scope.existingUser) _AnonRouter.route();
    },
    function(ex) {
        $scope.displayLoadingIndicator = false;
        $scope.isAddingToCart = false; // Reset flag on error
        if (ex.Code.is('PasswordSecurity'))
          $scope.securityWarning = true;
      else {
          $scope.actionMessage = $sce.trustAsHtml(ex.Message);
      }
  }
  );
    // console.log('Address 1', $scope.user.CustomFields[2].Value);
  if ($scope.currentCategory.InteropID === 'htz_uniform' || $scope.currentCategory.InteropID === 'dt_uniform') {
    // Reset error flag before attempting to add items
    $scope.hasInventoryErrors = false;
    addKitItems(chapterKitItems);
    // Note: Cart popup will be opened from addSelectedKitItems callback if no errors occur
  } else {
    // If not a uniform category, reset flag immediately
    $scope.isAddingToCart = false;
  }
  
  };
  
  
  
  }]);
  
  // Controller for inventory error modal
  four51.app.controller('InventoryErrorModalCtrl', ['$scope', '$modalInstance', '$sce', '$location', '$timeout', 'errorMessage', 'allProducts', 'tempOrder', 'auto', 'successCallback', 'scope', 'Order', 'User',
    function ($scope, $modalInstance, $sce, $location, $timeout, errorMessage, allProducts, tempOrder, auto, successCallback, scope, Order, User) {
      $scope.errorMessage = $sce.trustAsHtml(errorMessage);
      $scope.saving = false;
      $scope.canContinue = !!(tempOrder && allProducts); // Only show "Continue Anyways" if we have the data
      
      // Change Selection - just close the modal
      $scope.changeSelection = function () {
        $modalInstance.dismiss('cancel');
      };
      
      // Continue Anyways - save items and redirect to cart
      $scope.continueAnyways = function () {
        if (!tempOrder || !allProducts) {
          // If we don't have the data, just close
          $modalInstance.dismiss('cancel');
          return;
        }
        
        $scope.saving = true;
        
        // Save the order with all items (including out of stock ones)
        Order.save(tempOrder,
          function(data) {
            console.log('saved order with backorder items', data.ID, data.LineItems);
            scope.currentOrder = data;
            if (auto) {
              scope.currentOrder.autoID = true;
              scope.currentOrder.ExternalID = 'auto';
            }
            scope.user.CurrentOrderID = data.ID;
            User.save(scope.user, function() {
              scope.displayLoadingIndicator = false;
              $scope.saving = false;
              
              // Close modal first
              $modalInstance.close('continue');
              
              // Redirect to cart
              $timeout(function() {
                $location.path('/cart');
              }, 100);
            });
          },
          function(ex) {
            console.log('Order.save error when continuing anyway:', ex);
            $scope.saving = false;
            // Even if there's an error, we tried - show it to user
            alert('There was an error adding items to your cart. Please try again or contact support.');
            $modalInstance.dismiss('cancel');
          }
        );
      };
    }
  ]);
  