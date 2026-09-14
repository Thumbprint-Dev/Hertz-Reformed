four51.app.controller('LoginCtrl', ['$scope', '$sce', '$route', '$location', '$http', '$timeout', 'User', 
function ($scope, $sce, $route, $location, $http, $timeout, User) {
    $scope.PasswordReset = $location.search().token != null;
    var codes = ['PasswordSecurityException'];

    $scope.loginMessage = null;
    $scope.buttonText = $scope.PasswordReset ? 'Reset Password' : "Logon";
    $scope.$on('event:auth-loginFailed', function(event, message) {
        $scope.loginMessage = message;
    });

    // build a post method for password reset
    $scope.login = function() {
        $scope.loginMessage = null;
        // need to reset any error codes that might be set so we can handle new ones
        angular.forEach(codes, function(c) {
            $scope[c] = null;
        });
        $scope.credentials.PasswordResetToken = $location.search().token;
        $scope.PasswordReset ? _reset() : _login();
    };

    var _reset = function() {
        User.reset($scope.credentials,
            function(user) {
                $timeout(function() {
                    delete $scope.PasswordReset;
                    delete $scope.credentials;
                    $scope.buttonText = "Logon";
                    $location.path('catalog');
                });
            },
            function(ex) {
                $timeout(function() {
                    $scope.loginMessage = $sce.trustAsHtml(ex.Message);
                });
            }
        );
    };

    var _login = function() {
        // Wrap the callback-based function in a promise
        return new Promise((resolve, reject) => {
            User.login($scope.credentials, function(data) {
                $timeout(function() {
                    console.log('Login data:', data); // Debugging: Log the login response
                    if ($scope.credentials.Email) {
                        $scope.loginMessage = data.LogonInfoSent;
                        $scope.EmailNotFoundException = false;
                        $scope.showEmailHelp = false;
                    }
                    // Assume user data is part of the login response
                    $scope.user = data.user || data; // Adjust as needed based on actual response
                    resolve(data);
                });
            }, function(ex) {
                $timeout(function() {
                    $scope.credentials = {};
                    $scope[ex.Code.text] = true;
                    $scope.loginMessage = ex.Message || "User name and password not found";
                    if (ex.Code.is('PasswordSecurity'))
                        $scope.loginMessage = $sce.trustAsHtml(ex.Message);
                    if (ex.Code.is('EmailNotFoundException') && $scope.credentials.Email)
                        $scope.loginMessage = $sce.trustAsHtml(ex.Detail);
                    $scope.credentials.Username = null;
                    $scope.credentials.Password = null;
                    $scope.credentials.CurrentPassword = null;
                    $scope.credentials.NewPassword = null;
                    $scope.credentials.ConfirmPassword = null;
                });
                reject(ex);
            });
        })
        .then(function(data) {
            // Ensure $scope.user is defined
            return new Promise((resolve, reject) => {
                if ($scope.user) {
                    resolve($scope.user);
                } else {
                    reject('Error: $scope.user is undefined.');
                }
            });
        })
        .then(function(user) {
            $timeout(function() {
                var currentDate = new Date();
                var options = {
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                };

                var formatter = new Intl.DateTimeFormat('en-US', options);
                var parts = formatter.formatToParts(currentDate);

                var estDateString = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;

                var webhookData = {
                    username: user.Username,
                    timestamp: estDateString,
                    customField: 'Westminster Communities of FL',
                    customField2: '100000102',
                    customField3: user.Email,
                    customField4: user.FirstName,
                    customField5: user.LastName,
                };

                // Log the data being sent to the webhook
                console.log('Sending data to proxy:', webhookData);

                // Send user data to the proxy server
                $http({
                    method: 'POST',
                    url: 'https://everstory-logon-b7b9c2ab647e.herokuapp.com/proxy', 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: webhookData
                })
                .then(function(response) {
                    console.log('Data sent to webhook successfully:', response.data);
                })
                .catch(function(error) {
                    console.error('Error sending data to webhook:', error);
                });

                delete $scope.credentials;
            });
        })
        .catch(function(error) {
            console.error(error);
            $timeout(function() {
                $scope.credentials = {};
                $scope.loginMessage = error || "User name and password not found";
            });
        });
    };
}]);
