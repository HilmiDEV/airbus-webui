(function(angular, ol){
    'use strict';

    /**
     * @typedef {Object} GetCapabilitiesParameters
     * @property {RequestParam}     [REQUEST="GetCapabilities"]     - Must be "GetCapabilities"
     * @property {OGCService}       SERVICE                         - OGC service type.
     * @property {String}           VERSION                         - OGC service version.
     */

    /**
     * @ngdoc service
     * @name Capabilities
     * @module ol-capabilities
     *
     * @description Capabilities service provide a way to request and parse WMS and WMTS GetCapabilities documents.
     *
     * @param {$q}              $q              - {@link https://docs.angularjs.org/api/ng/service/$q}
     * @param {$http}           $http           - {@link https://docs.angularjs.org/api/ng/service/$http}
     * @param {$cacheFactory}   $cacheFactory   - {@link https://docs.angularjs.org/api/ng/service/$cacheFactory}
     * @param {Utils}           Utils
     *
     * @this Capabilities
     */
    function Capabilities_($q, $http, $cacheFactory, Utils) {
        var Capabilities = this;

        /**
         * @typedef {Object} Capabilities.options
         * @description Description object to request a GetCapabilities on a server
         * @property {RequestParam}             [REQUEST="GetCapabilities"]
         * @property {Capabilities.OGCService}  SERVICE                         - OGC service type. "WMS" and "WMTS" are supported.
         * @property {String}                   VERSION                         - OGC service version.
         * @property {String}                   URL                             - Base url for Capabilities request
         * @property {Capabilities.RequestType} [TYPE]                          - Request type, KVP or REST
         */

        /**
         * @typedef {Object} Capabilities.root
         * @description The capability document from GetCapabilities request parsed by {@see ol.format.WMSCapabilities} or {@see ol.format.WMTSCapabilities}
         */

        /**
         * @typedef {Object} Capabilities.layerWMS
         * @description The capability layer from a WMS GetCapabilities merged with parent layer if necessary
         */

        /**
         * Default parameter for REQUEST {@link GetCapabilitiesParameters}
         * @constant
         * @type String
         * @default "GetCapabilities"
         */
        Capabilities.RequestParam = "GetCapabilities";

        /**
         * Possible OGC service for SERVICE {@link GetCapabilitiesParameters}
         * @readonly
         * @enum {String} OGCService
         */
        Capabilities.OGCService = {
            WMS: 'WMS',
            WMTS: 'WMTS'
        };

        /**
         * @readonly
         * @enum {String} RequestType
         */
        Capabilities.RequestType = {
            "KVP" : "KVP",
            "REST" : "REST"
        };

        /**
         * Cache for GetCapabilities http request
         * @type $cacheFactory.Cache
         */
        var cache_http = $cacheFactory('capabilities_http');

        /**
         * Cache for Capabilities document parsing
         * @type $cacheFactory.Cache
         */
        var cache_parse = $cacheFactory('capabilities_parse');

        /**
         * WMS GetCapabilities parser
         * @type ol.format.WMSCapabilities
         */
        var WMSFormat = new ol.format.WMSCapabilities();

        /**
         * WMTS GetCapabilities parser
         * @type ol.format.WMTSCapabilities
         */
        var WMTSFormat = new ol.format.WMTSCapabilities();

        /**
         * @param {ol.source.Source} source An ol source to read
         * @returns {Capabilities.options}
         */
        function resolveOptionsFromSource(source) {
            var url;
            var params = {};
            if (source instanceof ol.source.ImageWMS) {
                url = source.getUrl();
                params = {
                    'VERSION' : source.getParams().VERSION,
                    'SERVICE' : Capabilities.OGCService.WMS
                };
            } else if (source instanceof ol.source.TileWMS) {
                url = source.getUrls()[0];
                params = {
                    'VERSION' : source.getParams().VERSION,
                    'SERVICE' : Capabilities.OGCService.WMS
                };
            } else if (source instanceof ol.source.WMTS) {
                url = source.getUrls()[0];
                params = {
                    'VERSION' : source.getVersion(),
                    'SERVICE' : Capabilities.OGCService.WMS
                };
            }

            return /** @type Capabilities.options */ angular.extend({
                URL: url,
                REQUEST: Capabilities.RequestParam
            }, params);
        }

        /**
         * @param {Capabilities.options|ol.source.Source} options
         * @returns {Capabilities.options|Array.<Capabilities.options>}
         */
        function resolveOptions(options) {
            if (options instanceof ol.source.Source) {
                console.log("Capabilities resolveOptions from ol.Source is deprecated.");
                return resolveOptionsFromSource(options);
            }
            var opts = [].concat(options);

            for (var o = 0, oMax = opts.length; o < oMax; o++) {
                var opt = opts[o];

                if (angular.isString(opt)) {
                    var parsed = Utils.parseParams(opt, true);
                    opts[o] = angular.extend({
                        URL : parsed.url
                    }, parsed.params);
                } else {
                    opts[o] = angular.extend({
                        REQUEST: "GetCapabilities"
                    }, opt);
                }
            }

            return opts;
        }

        /**
         * @param {String} url the base url to request GetCapabilities
         * @param {GetCapabilitiesParameters} params
         * @return {!Promise.<Object>} A promise with GetCapabilities document
         */
        function getCapabilitiesDocument(url, params) {
            return $http.get(url, {
                params: params,
                cache: cache_http
            }).then(function(result){
                return result.data;
            });
        }

        /**
         * Call the Capabilities parser on capabilities document
         * @param {Node} capabilities
         * @param {Capabilities.OGCService} service
         * @param {String} url
         * @return {!Promise.<Capabilities.root>}
         */
        function parseCapabilities(capabilities, service, url) {
            var capabilitiesObject;
            switch (service) {
                case Capabilities.OGCService.WMS :
                    capabilitiesObject = WMSFormat.read(capabilities);
                    capabilitiesObject.type = Capabilities.OGCService.WMS;
                    capabilitiesObject.url = url;
                    break;
                case Capabilities.OGCService.WMTS :
                    capabilitiesObject = WMTSFormat.read(capabilities);
                    capabilitiesObject.type = Capabilities.OGCService.WMTS;
                    capabilitiesObject.url = url;
                    break;
            }
            return $q.when(capabilitiesObject);
        }

        /**
         * @param {Capabilities.options} options
         * @returns {!Promise.<Capabilities.root>}
         */
        function _requestCapabilities(options) {
            var params = angular.copy(options);
            delete params.URL;

            if (angular.isUndefined(params.VERSION)) {
                delete params.VERSION;
            }

            if (options.TYPE === Capabilities.RequestType.REST || Utils.endsWith(options.URL, ".xml")) {
                options.TYPE = Capabilities.RequestType.REST;
                params = undefined;
            }

            return getCapabilitiesDocument(options.URL, params)
                .then(function(capabilities) {
                    var url = Utils.computeUrl(options.URL, params);

                    var capability = cache_parse.get(url);
                    if (capability === undefined || capability === null) {

                        // If capability document is WMS

                        switch (options.SERVICE) {
                            case Capabilities.OGCService.WMS :
                                if (capabilities.search(/(http:\/\/www\.opengis\.net\/wms)|(WMT_MS_Capabilities)|(WMS_Capabilities)/) < 0) {
                                    throw new Error("The capabilities document is not a WMS Capabilities : "+url);
                                }
                                break;
                            case Capabilities.OGCService.WMTS :
                                if (capabilities.search(/(http:\/\/www\.opengis\.net\/wmts\/1\.0)/) < 0) {
                                    throw new Error("The capabilities document is not a WMTS Capabilities : "+url);
                                }
                                break;
                            default :
                                throw new Error("Unrecognized service type "+options.SERVICE);
                        }

                        capability = parseCapabilities(capabilities, options.SERVICE, url);

                        // http://neowms.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&BBOX=-67.5,0,-45,22.5&SRS=EPSG:4326&STYLES=&LAYERS=MOD14A1_M_FIRE&WIDTH=256&HEIGHT=256&TIME=2015-12-01

                        cache_parse.put(url, capability);
                    }

                    return capability;
                });
        }

        /**
         *
         * @param {Capabilities.options|Array.<Capabilities.options>}    optionnals
         * @returns {!Promise.<Capabilities.root>}
         */
        function requestCapabilities(optionnals) {
            var _opts = [].concat(angular.copy(optionnals));

            var options = _opts.shift();

            // Setup first attempt.
            var promise = _requestCapabilities(options);

            // Chain other attempts.
            angular.forEach(_opts, function(opts) {
                promise = promise.then(
                    function successCallback(capabilities) {
                        // OK, we got a response.
                        return capabilities;
                    },
                    function failureCallback() {
                        // KO, try with another version.
                        return _requestCapabilities(angular.extend({}, options, opts));
                    });
            });
            return promise;
        }

        /**
         * @param {ol.source.Source|Capabilities.options|Array.<Capabilities.options>|String|Array.<String>} opts Options to request the capabilities document
         * @returns {!Promise.<Capabilities.root>} A promise resolved by the parsing capabilities document
         */
        Capabilities.get = function(opts) {
            return /** @type {Promise} */ $q.when(opts)
                .then(resolveOptions)
                .then(Utils.upperCaseKeys)
                .then(requestCapabilities);
        };

    }

    /**
     * @namspace ol-capabilities
     * @requires ng
     * @requires airbus.shared.utils
     */
    angular.module("ol-capabilities", ["ng", "airbus.shared.utils"])
        .service("Capabilities", Capabilities_);

})(angular, ol);