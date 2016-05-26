/**
 * @ngdoc provider
 */
function SettingsServiceProvider() {

    var self = this;

    var defaultValue = {};


    self.defaultValue = function(value) {
        defaultValue = value;
        return self;
    };


    self.$get = ['$rootScope', 'localStorage', function($rootScope, localStorage) {

        var storage = localStorage('settings');

        var settings = angular.extend(angular.copy(defaultValue), storage.read());


        return {
            getValue: function() {
                // Return a copy to force the using of the "setValue" method to apply modifications.
                return angular.copy(settings);
            },

            setValue: function(value) {
                settings = value;

                // Broadcast 'settingsChanged' event.
                $rootScope.$broadcast('settingsChanged', angular.copy(value));

                // Write the new settings in local storage.
                storage.write(settings);
            }
        };
    }];
}


/**
 * @namespace airbus.shared.settings
 * @requires ng
 * @requires airbus.shared.utils
 */
angular.module('airbus.shared.settings', ['ng', 'airbus.shared.utils'])
    .provider('settingsService', SettingsServiceProvider);

