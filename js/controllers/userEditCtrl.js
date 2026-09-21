four51.app.controller('UserEditCtrl', ['$scope', '$location', '$sce', '$injector', 'User', 'Order', 'Allocation',
    function ($scope, $location, $sce, $injector, User, Order, Allocation) {
        var _AnonRouter;
        if ($scope.user) $scope.existingUser = $scope.user.Type != 'TempCustomer';
        try {
            _AnonRouter = $injector.get('AnonRouter');
        }
        catch(ex){}

        /**
         * Who the employee is, from the HR feed: department, job title, allocation group,
         * when the cycle turns over. Four51 holds none of this, which is why the account
         * page showed four editable contact fields and nothing an employee wanted.
         *
         * Read-only. The feed is the authority, so there is nothing to save; the page
         * says so and points at the Uniform Champion.
         *
         * A failure here is not fatal to the page. The Four51 contact fields still render
         * and `profileError` lets the view say the rest could not be loaded, rather than
         * showing a column of blanks that look like missing data about the person.
         */
        $scope.profile = null;
        $scope.profileError = false;
        Allocation.profile()
            .then(function(p) { $scope.profile = p; })
            .catch(function() { $scope.profileError = true; });

        User.get(function(user) {
            $scope.user = user;
            $scope.loginasuser = {};
            $scope.actionMessage = null;
            $scope.securityWarning = false;

            if ($scope.user.Type != 'TempCustomer')
                $scope.user.TempUsername = $scope.user.Username;
            $scope.getToken = function () {
                $scope.loginasuser.SendVerificationCodeByEmail = true;
                $scope.emailResetLoadingIndicator = true;
                User.login($scope.loginasuser, function () {
                        $scope.resetPasswordError = null;
                        $scope.enterResetToken = true;
                        $scope.emailResetLoadingIndicator = false;
                    },
                    function (err) {
                        $scope.resetPasswordError = $sce.trustAsHtml(err.Message);
                        $scope.emailResetLoadingIndicator = false;
                    });

            }
            $scope.resetWithToken = function () {
                $scope.emailResetLoadingIndicator = true;
                if($scope.currentOrder){
                    $scope.loginasuser.CurrentOrderID = $scope.currentOrder.ID;
                }
                User.reset($scope.loginasuser, function (user) {
                        delete $scope.loginasuser;
                        if(user.CurrentOrderID){
                            $scope.currentOrder.FromUserID = user.ID;
                            Order.save($scope.currentOrder,function(ordr){
                                $location.path('checkout');
                            });
                        }
                        else{
                            $location.path('catalog');
                        }
                    },
                    function (err) {
                        $scope.emailResetLoadingIndicator = false;
                        $scope.resetPasswordError = $sce.trustAsHtml(err.Message);
                    });
            }
            $scope.save = function () {
                $scope.actionMessage = null;
                $scope.securityWarning = false;
                $scope.user.Username = $scope.user.TempUsername;
                $scope.displayLoadingIndicator = true;
                if ($scope.user.Type == 'TempCustomer')
                    $scope.user.ConvertFromTempUser = true;

                User.save($scope.user,
                    function (u) {
                        $scope.securityWarning = false;
                        $scope.displayLoadingIndicator = false;
                        $scope.actionMessage = 'Your changes have been saved';
                        $scope.user.TempUsername = u.Username;
                        if (_AnonRouter && !$scope.existingUser) _AnonRouter.route();
                    },
                    function (ex) {
                        $scope.displayLoadingIndicator = false;
                        if (ex.Code.is('PasswordSecurity'))
                            $scope.securityWarning = true;
                        else {
                            $scope.actionMessage = $sce.trustAsHtml(ex.Message);
                        }
                    }
                );
            };
            $scope.loginExisting = function () {
                User.login({Username: $scope.loginasuser.Username, Password: $scope.loginasuser.Password, ID: $scope.user.ID, Type: $scope.user.Type}, function (u) {
                    if (_AnonRouter) _AnonRouter.route();
                }, function (err) {
                    $scope.loginAsExistingError = err.Message;
                });
            };
        });
    }]);