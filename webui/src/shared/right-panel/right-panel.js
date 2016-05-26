/**
 * @ngdoc service
 */
function RightPanelDriverService($q) {

    var self = this;

    var active;

    var paused;


    self.open = function(name) {
        paused = active;
        active = {
            name: name,
            deferred: $q.defer()
        };
        active.deferred.promise.finally(function() {
            active = paused;
            paused = undefined;
        });
        return active.deferred.promise;
    };

    self.close = function(result) {
        if (angular.isDefined(active)) {
            active.deferred.resolve(result);
        }
    };

    self.isOpen = function(name) {
        return (angular.isDefined(active) && active.name === name) || self.isPaused(name);
    };

    self.isPaused = function(name) {
        return (angular.isDefined(paused) && paused.name === name);
    };

    self.isEmpty = function() {
        return angular.isUndefined(active);
    };
}


/**
 * @namespace airbus.shared.rightPanel
 * @requires ng
 */
angular.module('airbus.shared.rightPanel', ['ng'])
    .service('rightPanelDriver', RightPanelDriverService);