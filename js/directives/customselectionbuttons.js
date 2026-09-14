four51.app.directive('customselectionbuttons', function() {
	var obj = {
		scope: {
			customfield : '=',
			change: '='
		},
		restrict: 'E',
		templateUrl: 'partials/controls/customSelectionButtons.html',
		link: function(scope, element, attr) {
			scope.selectOption = function(option) {
				angular.forEach(scope.customfield.Options, function(opt) {
					opt.Selected = false;
				});
				option.Selected = true;
				scope.customfield.Value = option.Value;
				scope.customfield.SelectedOptionID = option.ID;
				if (scope.change)
					scope.change(scope.customfield);
			};

			scope.init = function() {
				var matched = null;
				angular.forEach(scope.customfield.Options, function(opt) {
					opt.Selected = scope.customfield.Value != null && opt.Value == scope.customfield.Value;
					if (opt.Selected) matched = opt;
				});
				if (matched == null && scope.customfield.DefaultOptionID != null) {
					angular.forEach(scope.customfield.Options, function(opt) {
						if (opt.ID == scope.customfield.DefaultOptionID) {
							opt.Selected = true;
							scope.customfield.Value = opt.Value;
							scope.customfield.SelectedOptionID = opt.ID;
						}
					});
				}
			};
		}
	};
	return obj;
});
