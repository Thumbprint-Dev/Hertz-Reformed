four51.app.filter('onproperty', ['$451', function($451) {
    var defaults = {
      'OrderStats': 'Type',
      'Message': 'Box'
    };
  
    return function(input, query) {
      if (!input || input.length === 0) return;
      if (!query) return input;
      query.Property = query.Property || defaults[query.Model];
      return $451.filter(input, query);
    }
  }]);
  
  four51.app.filter('kb', function() {
    return function(value) {
      return isNaN(value) ? value : parseFloat(value) / 1024;
    }
  });
  
  four51.app.filter('r', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
    return function(value) {
      var result = value,
        found = false;
      angular.forEach(WhiteLabel.replacements, function(c) {
        if (found) return;
        if (c.key == value) {
          result = $sce.trustAsHtml(c.value);
          found = true;
        }
      });
      return result;
    }
  }]);
  
  four51.app.filter('rc', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
    return function(value) {
      var result = value,
        found = false;
      angular.forEach(WhiteLabel.replacements, function(c) {
        if (found) return;
        if (c.key.toLowerCase() == value.toLowerCase()) {
          result = $sce.trustAsHtml(c.value);
          found = true;
        }
      });
      return result;
    }
  }]);
  
  four51.app.filter('rl', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
    return function(value) {
      var result = value,
        found = false;
      angular.forEach(WhiteLabel.replacements, function(c) {
        if (found) return;
        if (c.key.toLowerCase() == value.toLowerCase()) {
          result = $sce.trustAsHtml(c.value.toLowerCase());
          found = true;
        }
      });
      return result;
    }
  }]);
  
  four51.app.filter('noliverates', function() {
    return function(value) {
      var output = [];
      angular.forEach(value, function(v) {
        if (v.ShipperRateType != 'ActualRates')
          output.push(v);
      });
      return output;
    }
  });
  
  four51.app.filter('paginate', function() {
    return function(input, start) {
      if (typeof input != 'object' || !input) return;
      start = +start; //parse to int
      return input.slice(start);
    }
  });
  
  
  /**
   * IMPORTANT:
   * Angular filters must be synchronous. The previous implementation used Address.get(...)
   * which is async, causing the filter to return an empty array and breaking shipper defaulting.
   *
   * This filter now always returns the "FedEx Ground" shipper (case-insensitive) if it exists.
   * If it doesn't exist, it falls back to returning the full shippers list unchanged.
   */
  four51.app.filter('shipperFilter', [function() {
    return function(shippers /*, addresses, currentid, order */) {
      if (!shippers || !shippers.length) return shippers;
      var fedexGround = null;
      angular.forEach(shippers, function(s) {
        if (!fedexGround && s && s.Name && s.Name.toLowerCase().indexOf('fedex ground') !== -1) {
          fedexGround = s;
        }
      });
      return fedexGround ? [fedexGround] : shippers;
    };
  }]);
  
  
  