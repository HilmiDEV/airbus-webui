/**
 * @ngdoc service
 * @name Proxy
 *
 * @param {$location} $location - {https://docs.angularjs.org/api/ng/service/$location}
 *
 * @this Proxy
 */
function Proxy_($location) {
    var Proxy = this;

    /**
     *
     * @param {Element.<a> | String} parser Element <a> with correct href parsed or the string url
     * @returns {boolean} if the given parser Element <a> need to be proxy
     */
    Proxy.needProxy = function(parser) {

        var _parser = parser;
        if (angular.isString(_parser)) {
            _parser = document.createElement("a");
            _parser.href = parser;
        }

        var appHost;
        if ($location.port() !== 80) {
            appHost = $location.host()+":"+$location.port();
        } else {
            appHost = $location.host();
        }

        return appHost !== _parser.host;
    };
}

/**
 * @ngdoc factory
 * @name Proxifier
 *
 * @param {Proxy}   Proxy
 * @param {Utils}   Utils
 * @param {Object} settingsService
 * @returns {{request: Function}}
 */
function Proxifier_(Proxy, Utils, settingsService) {
    return {
        "request" : function(config) {
            if (config.proxify === false) {
                return config;
            }

            var parser = document.createElement("a"),
                settings = settingsService.getValue();

            parser.href = config.url;

            if (Proxy.needProxy(parser)) {
                var options = Utils.parseParams(parser);

                config.params = {
                    target : Utils.computeUrl(options.url, angular.extend({},config.params, options.params))
                };
                config.url = settings.proxyUrl;
            }

            return config;
        }
    };
}

function _proxyConfig($httpProvider) {
    //$httpProvider.interceptors.push('Proxifier');
}

/**
 * @namespace airbus.shared.proxy
 * @requires ng
 */
angular.module("airbus.shared.proxy", ["ng","airbus.shared.settings"])
    .service("Proxy", Proxy_)
    .factory("Proxifier", Proxifier_)
    .config(_proxyConfig);