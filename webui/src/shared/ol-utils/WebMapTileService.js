/**
 * @ngdoc service
 * @name WebMapTileService
 * @module ol-webmaptileservice
 *
 * @param {Capabilities}    Capabilities
 * @param {Utils}           Utils
 *
 * @this WebMapTileService
 */
function WebMapTileService(Capabilities, Utils) {
    var self = this;

    /**
     * @enum {String} VERSION
     */
    self.VERSION = {
        "v1_0_0" : "1.0.0",
        "_1_0_0" : "1.0.0"
    };

    function getDimensionsOf(layerCapability) {
        var dimensions = {};
        if (angular.isDefined(layerCapability) && angular.isDefined(layerCapability.Dimension)) {
            angular.forEach(layerCapability.Dimension, function(dimension) {
                var name = dimension.Identifier.toUpperCase();
                dimensions[name] = dimension;

                switch (name) {
                    case "TIME" :
                        dimensions[name].values = [];
                        angular.forEach(dimensions[name].Value, function(value) {
                            var _values = value.split(",");

                            var newVals = [];
                            for (var i = 0, length = _values.length; i<length; i++) {
                                var _value = _values[i];

                                var periods = _value.split("/");
                                if (periods.length === 3) {
                                    var start = moment.utc(periods[0]);
                                    var end = moment.utc(periods[1]);
                                    var duration = moment.duration(periods[2]);
                                    do {
                                        newVals.push(start.toISOString());
                                    } while (start.add(duration) <= end);
                                } else {
                                    newVals.push(_value);
                                }
                            }
                            dimensions[name].values = dimensions[name].values.concat(newVals);
                        });
                        break;
                    default :
                        dimensions[name].values = dimensions[name].values.split(",");
                }
            });
        }
        return dimensions;
    }

    /**
     * Returns an array that contains all layers from the capabilities document.
     * @param {Capabilities.root}      capabilities    -   Parsing capabilities document.
     * @returns {Array}     The array of all layers in given capabilities
     */
    self.getCapabilityLayers = function(capabilities) {
        if (capabilities && capabilities.Contents && capabilities.Contents.Layer) {
            return capabilities.Contents.Layer;
        }
        return [];
    };

    /**
     *
     *
     * @param   {Capabilities.root}   capabilities
     * @returns {String} GetCapabilities url from Capabilities object
     */
    self.getCapabilitiesUrl = function(capabilities) {
        var capabilityUrl = {};
        if (capabilities.OperationsMetadata &&
            capabilities.OperationsMetadata.GetCapabilities &&
            capabilities.OperationsMetadata.GetCapabilities.DCP &&
            capabilities.OperationsMetadata.GetCapabilities.DCP.HTTP.Get) {

            capabilityUrl = Utils.parseParams(capabilities.OperationsMetadata.GetCapabilities.DCP.HTTP.Get[0].href);
            // TODO fill params only if not a RESTfull href
            capabilityUrl.params.SERVICE = Capabilities.OGCService.WMTS;
            capabilityUrl.params.VERSION = capabilities.version;
            capabilityUrl.params.REQUEST = Capabilities.RequestParam;
        }
        return Utils.computeUrl(capabilityUrl.url, capabilityUrl.params);
    };

    self.findCapabilityLayer = function(capabilities, identifier) {
        if (capabilities && capabilities.Contents && capabilities.Contents.Layer) {
            for (var l = 0, lMax = capabilities.Contents.Layer.length; l<lMax; l++) {
                var layer = capabilities.Contents.Layer[l];
                if (layer.Identifier === identifier) {
                    return layer;
                }
            }
        }
        return undefined;
    };

    /**
     *
     * @param {Capabilities.root} capabilities - Capabilities WMTS object
     * @param {Object}  options
     * @param {Object}  options.SOURCE  -   Similar to config params in {@link http://openlayers.org/en/v3.13.0/apidoc/ol.source.WMTS.html#.optionsFromCapabilities}
     */
    self.createLayerParams = function(capabilities, options) {
        var _opts = angular.copy(options);

        var capabilityLayer = self.findCapabilityLayer(capabilities, _opts.SOURCE.layer);
        var capabilityUrl = capabilities.url || self.getCapabilitiesUrl(capabilities);

        var projection = ol.proj.get(_opts.SOURCE.projection) || ol.proj.get("CRS:84");
        var extent = ol.proj.transformExtent(capabilityLayer.WGS84BoundingBox, "CRS:84", projection);

        var styles = [];
        angular.forEach(capabilityLayer.Style, function(style) {
            if (style.isDefault) {
                styles.unshift(style.Identifier);
            } else {
                styles.push(style.Identifier);
            }
        });
        if (styles.length > 0 && options.SOURCE.style && styles.indexOf(_opts.SOURCE.style) < 0) {
            _opts.SOURCE.style = styles[0];
        }


        var dimensions = getDimensionsOf(capabilityLayer);
        // TODO make dimensions parser

        var defaultDimensions = angular.extend({}, _opts.SOURCE.dimensions);
        // Compute default dimension parameters and check if given wanted dimension exist on GetCapabilities
        angular.forEach(dimensions, function(dimension, name) {
            if (angular.isDefined(defaultDimensions[name])) {
                if (dimension.values.indexOf(defaultDimensions[name]) < 0) {
                    delete defaultDimensions[name];
                }
            }
            if (!angular.isDefined(defaultDimensions[name]) && angular.isDefined(dimension.Default)) {
                defaultDimensions[name] = dimension.Default;
            }
        });

        var source_opts = angular.extend({
            dimensions : defaultDimensions,
            crossOrigin: 'anonymous'
        }, ol.source.WMTS.optionsFromCapabilities(capabilities, angular.extend({}, _opts.SOURCE, {
            projection : projection.getCode()
        })));

        delete _opts.SOURCE;

        return angular.extend(_opts, {
            title: capabilityLayer.Title,
            //publisher: entry.publisher, // TODO : compute publisher from GetCapabilities
            extent: extent,
            projection: projection,

            capability : capabilityLayer,
            capabilityUrl : capabilityUrl,
            dimensions : dimensions,
            styles: styles,

            source: new ol.source.WMTS(source_opts)
        });
    };
}

/**
 * @namespace ol-webmaptileservice
 * @requires ng
 * @requires ol-capabilities
 */
angular.module("ol-webmaptileservice", ["ng", "ol-capabilities"])
    .service("WebMapTileService", WebMapTileService);