angular.module('OrderCloud-CategoryModal', []);

angular.module('OrderCloud-CategoryModal')
  .directive('categorymodal', categorymodal)
  .controller('CategoryModalCtrl', CategoryModalCtrl);

function categorymodal() {
  return {
    restrict: 'E',
    template: [
      '<style>',
      // Optional styling
      '</style>',
      '<a ng-click="openCategory(500)">',
      '<i class="fa fa-shopping-bag"></i>',
      '<span class="hidden-xs">{{\'Never see this popup again\' | r | xlat}}</span>',
      '</a>'
    ].join(''),
    controller: 'CategoryModalCtrl'
  };
}

CategoryModalCtrl.$inject = ['$scope', '$modal', '$log', 'User', '$timeout', 'OrderSearchCriteria'];

function CategoryModalCtrl($scope, $modal, $log, User, $timeout, OrderSearchCriteria) {

  $scope.animationsEnabled = true;
  $scope.openOrderCountModal = 0;

  $scope.openCategory = function (size) {
    var modalInstance = $modal.open({
      animation: $scope.animationsEnabled,
      backdrop: true,
      keyboard: true,
      size: size,
      template: categorymodalopen(),
      controller: CategoryModalOpenCtrl,
      resolve: {
        theuser: function () {
          return $scope.user;
        }
      }
    });

    modalInstance.result.then(function (currentCategory) {
      $scope.current = currentCategory;
    }, function () {
      $log.info('Modal dismissed at: ' + new Date());
    });
  };

  // Optional logic to auto-open modal
OrderSearchCriteria.query(function (orders) {
  angular.forEach(orders, function (order) {
    if (order.DisplayName === "Open") {
      $scope.openOrderCountModal = order.Count;

      if (
        $scope.openOrderCountModal === 0 &&
        $scope.user &&
        $scope.user.CustomFields &&
        $scope.user.CustomFields[0].Value === null &&
        ($scope.conSpringUser === true || $scope.conOfficeSpringUser === true)
      ) {
        $timeout(function () {
          $scope.openCategory(500);
        }, 500);
      }
    }
  });
});


  function categorymodalopen() {
    return [
        '<style>',
        '.modal-header {min-height: 36px; padding: 2px;border-bottom: 1px solid #e5e5e5;}',
        '.modal-header h3 { margin-top:0;}',
        '.modal-header h5 { font-size:1.16em; font-weight:bold; padding:5px 10px; text-shadow: 0 1px 0 #ffffff;}',
        '.modal-header a.close {margin:0;padding:0;position:absolute;top:8px;right:10px;font-size:1.5em;color:#000;}',
        '.modal-body {width:100%; margin:0 auto; padding:10px 25px;}',
        '</style>',
        '<div class="modal-header" style="padding:0;">',
        //Optional title in top header
        '<img src="https://thumbprint.com/four51_images/ThompsonThrift/banner-thompson_thrift.png" alt="Spring 2025" style="width: 100%;border-top-left-radius: 6px;border-top-right-radius: 6px;">',
        //Optional close (x) in top header
        '<a class="pull-right close" ng-click="close()" style="top: 2px;">',
        '<i class="fa fa-times"></i>',
        '</a>',
        '</div>',
        '<div class="modal-body" style="padding-top: 25px;text-align: center;" ng-show="conFieldUser === true">',
        '<p style="font-size: 18px;">',
        '<strong>It\’\s that time again<br/>our Spring 2025 Construction Apparel drop is here!</strong><br/><br/>Select your size for your apparel kit refresh and get ready for the season. You\’\ll also receive $75 to spend on apparel of your choice—just use coupon code <strong>TTCSPRING25</strong> at checkout.<br/><br/><strong>Order window: Thurday, May 22 – Thursday, May 29</strong><br/><br/>No late orders or extras will be available—do not miss out!<br/><br/>All sales are final, so please double-check the sizing chart before submitting your order.<br/><br/>',
        '</p>',
        '<br/>',
        '<p>',
        '<a target="_blank" class="btn btn-info" ng-click="shirtClose()" style="font-size: 18px;">View Apparel</a>',
        '</p>',
        //'<h4>Subheading</h4>',
        '</div>',
        // office
        '<div class="modal-body" style="padding-top: 25px;text-align: center;" ng-show="conOfficeUser === true">',
        '<p style="font-size: 18px;">',
        '<strong>It\’\s that time again<br/>our Spring 2025 Construction Apparel drop is here!</strong><br/><br/>Grab $75 to spend on the gear you love this season—just click the link below and use code <strong>TTCSPRING25</strong> at checkout.<br/><br/><strong>Order window: Thurday, May 22 – Thursday, May 29</strong><br/><br/>No late orders or extras will be available—do not miss out!<br/><br/>All sales are final, so please double-check the sizing chart before submitting your order.<br/><br/>',
        '</p>',
        '<br/>',
        '<p>',
        '<a target="_blank" class="btn btn-info" ng-click="shirtClose()" style="font-size: 18px;">View Apparel</a>',
        '</p>',
        '</div>',
        //Optional footer
        '<div class="modal-footer">',
        '<div class="pull-left">',
        // '<a class="btn btn-default" ng-click="cancel()">Cancel</a>',
        '<div ng-repeat="field in user.CustomFields | filter:{Name:\'PosiGen_UpdatePassword\'}">',
        '<occheckboxfield id="update-password-field" customfield="field" ng-required="field.IsRequired" label=\'Check box and click CLOSE to never see this pop-up again\' checked=\'Yes\' unchecked=\'No\'/>',
        '</div>',
        '</div>',
        '<div class="pull-right">',
        '<a target="_blank" class="btn btn-info" ng-click="close()">Close</a>',
        '</div>',
        '</div>'
    ].join('');
  }

  var CategoryModalOpenCtrl = ['$scope', '$location', '$modalInstance', '$modal', 'theuser', 'User', 'OrderSearchCriteria',
    function ($scope, $location, $modalInstance, $modal, theuser, User, OrderSearchCriteria) {

      $scope.user = theuser;
      $scope.openOrderCountModal = 0;

      $scope.$watch('openOrderCountModal', function (newVal, oldVal) {
        if (newVal !== oldVal) {
          $scope.openOrderCountModal = newVal;
          console.log('openOrderCountModal changed: ', newVal);
        }
      });


      $scope.conFieldUser = false;
      $scope.conOfficeUser = false;
      angular.forEach($scope.user.Groups, function(group){
      if(group.Name == "Construction Field"){
        $scope.conFieldUser = true;
      }
      if(group.Name == "Construction Office"){
        $scope.conOfficeUser = true;
      }
      // console.log('conFieldUser ', $scope.conFieldUser);
      // console.log('conOfficeUser ', $scope.conOfficeUser);
    });

      OrderSearchCriteria.query(function (orders) {
        angular.forEach(orders, function (order) {
          if (order.DisplayName === "Open") {
            $scope.openOrderCountModal = order.Count;
          }
        });
      });

      $scope.save = function () {
        $scope.displayLoadingIndicator = true;
        User.save($scope.user, function () {
          $scope.displayLoadingIndicator = false;
        });
      };

      $scope.close = function () {
        $scope.save();
        $modalInstance.close();
      };

      $scope.shirtClose = function () {
        $scope.save();
        $modalInstance.close();
        if ($scope.conFieldUser === true) {
          $location.path('product/TTH-KIT-CON');
        }
        if ($scope.conOfficeUser === true) {
          $location.path('catalog/tt_con_all');
        }
      };

      $scope.retarget = function (url) {
        $scope.target = url;
        $location.path(url);
        $modalInstance.close();
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    }];
}
