/**
 * @ngdoc service
 * @name WebMapService
 * @module ol-webmapservice
 *
 * @param {Capabilities}    Capabilities
 * @param {Utils}           Utils
 *
 * @this WebMapService
 */
function WebMapService_(Capabilities, Utils) {
    var self = this;

    /**
     * @readonly
     * @enum {String} VERSION
     */
    self.VERSION = {
        'v1_1_1' : "1.1.1",
        '_1_1_1' : "1.1.1",
        'v1_3_0' : "1.3.0",
        '_1_3_0' : "1.3.0"
    };

    function getWantedIn(full_list, wanted, filter, search) {
        var list = angular.isDefined(wanted) ? [].concat(wanted) : full_list;

        for (var it = 0, lg = list.length; it < lg; it++) {
            var obj = list[it];

            if (full_list.indexOf(obj) !== -1 || (typeof search === "function" && search(full_list, obj))) {
                if (typeof filter === "function" && !filter(obj)) {
                    continue;
                }

                return obj;
            }
        }
        return undefined;
    }

    /**
     *
     * @param {Capabilities.layerWMS} capabilityLayer
     * @param {Array.<String>|String} [projections]       -   The wanted projection or an Array of wanted projections in order or undefined to find the first supported projection
     * @param {Boolean}               [strict=false]
     * @returns {ol.proj.Projection}
     *
     * @throws Error if projection in proj_list was not found with strict mode or if none of the projection in capabilyLayer was supported
     */
    function getProjectionOf(capabilityLayer, projections, strict) {
        var code = getWantedIn(capabilityLayer.CRS || capabilityLayer.SRS || [], projections, function(proj_code) {
            return angular.isDefined(ol.proj.get(proj_code));
        });
        var proj = ol.proj.get(code);

        // If not strict, get the dirst supported CRS
        if (!proj && !strict) {
            code = getWantedIn(capabilityLayer.CRS || capabilityLayer.SRS || [], undefined, function(proj_code) {
                return angular.isDefined(ol.proj.get(proj_code));
            });
            proj = ol.proj.get(code);
        }

        if (!angular.isDefined(proj)) {
            throw new Error("Unable to find supported projection on this capabilities for the layer "+capabilityLayer.Name);
        }

        return proj;
    }

    function getFormatsOf(capabilities) {
        var formats = [];
        // Check GetMap format
        if (capabilities.Capability &&
            capabilities.Capability.Request &&
            capabilities.Capability.Request.GetMap &&
            capabilities.Capability.Request.GetMap.Format) {

            formats = formats.concat(capabilities.Capability.Request.GetMap.Format);
        }
        return formats;
    }

    /**
     * Compute the maximal extent possible for the given projection, capabilityLayer and wanted extent
     * @param {Capabilities.layer}  capabilityLayer -   The capability layer to compute extent
     * @param {ol.proj.Projection}  projection      -   The wanted projection
     * @param {ol.extent.Extent}    [extent]        -   The wanted extent in the same projection as projection
     * @returns {ol.extent.Extent} in LonLat
     */
    function getExtentOf(capabilityLayer, projection, extent) {
        // Create extent of the layer
        var layerExtent = projection.getExtent();
        if (angular.isArray(extent) && extent.length === 4 && !ol.extent.isEmpty(extent)) {
            var bbox = angular.copy(extent);

            // Proj4 transformation need always longitude first
            if (typeof projection.getAxisOrientation === "function" && projection.getAxisOrientation().substr(0, 2) === 'ne') { // ne == lattitude/longitude
                bbox = [bbox[1], bbox[0], bbox[3], bbox[2]];
            } else {
                var crsdef = proj4.defs(projection.getCode());
                var axOrientation = crsdef ? (crsdef.axis || "enu"): "enu";
                if (axOrientation.substr(0, 2) === 'ne') {
                    bbox = [bbox[1], bbox[0], bbox[3], bbox[2]];
                }
            }

            layerExtent = ol.extent.getIntersection(layerExtent, bbox);
        }

        if (angular.isDefined(capabilityLayer) && angular.isArray(capabilityLayer.BoundingBox)) {
            for (var bb = 0, length = capabilityLayer.BoundingBox.length; bb < length; bb++) {
                var boundingBox = capabilityLayer.BoundingBox[bb];

                var crs = ol.proj.get(boundingBox.crs || boundingBox.srs);
                if (angular.isDefined(crs)) {
                    var bbox_in = boundingBox.extent;
                    // Proj4 transformation need always longitude first
                    if (typeof crs.getAxisOrientation === "function" && crs.getAxisOrientation().substr(0, 2) === 'ne') { // ne == lattitude/longitude
                        bbox_in = [bbox_in[1], bbox_in[0], bbox_in[3], bbox_in[2]];
                    } else {
                        var crsdef_in = proj4.defs(crs.getCode());
                        var axOrientation_in = crsdef_in ? (crsdef_in.axis || "enu"): "enu";
                        if (axOrientation_in.substr(0, 2) === 'ne') {
                            bbox_in = [bbox_in[1], bbox_in[0], bbox_in[3], bbox_in[2]];
                        }
                    }

                    var reprojBbox_in = ol.proj.transformExtent(bbox_in, crs, projection);
                    layerExtent = ol.extent.getIntersection(layerExtent, reprojBbox_in);
                    break;
                }
            }
        }
        // TODO : else if capabilityLayer.LatLonBoundingBox for version 1.1.1
        // TODO else if capabilityLayer.EX_GeographicalBoundingBox for version 1.3.0

        return layerExtent;
    }

    function getDimensionsOf(layerCapability) {
        var dimensions = {};
        if (angular.isDefined(layerCapability) && angular.isDefined(layerCapability.Dimension)) {
            angular.forEach(layerCapability.Dimension, function(dimension) {
                dimensions[dimension.name.toUpperCase()] = dimension;

                switch (dimension.name.toUpperCase()) {
                    case "TIME" :
                        var values = dimensions[dimension.name.toUpperCase()].values.split(",");
                        var newVals = [];

                        for (var i = 0, length = values.length; i<length; i++) {
                            var value = values[i];

                            var periods = value.split("/");
                            if (periods.length === 3) {
                                var start = moment.utc(periods[0]);
                                var end = moment.utc(periods[1]);
                                var duration = moment.duration(periods[2]);
                                do {
                                    newVals.push(start.toISOString());
                                } while (start.add(duration) <= end);
                            } else {
                                newVals.push(value);
                            }
                        }

                        dimensions[dimension.name.toUpperCase()].values = newVals;
                        break;
                    default :
                        dimensions[dimension.name.toUpperCase()].values = dimensions[dimension.name.toUpperCase()].values.split(",");
                }
            });
        }
        return dimensions;
    }

    function getStylesOf(capabilityLayer) {
        var _styles = [];
        if (angular.isDefined(capabilityLayer) && angular.isDefined(capabilityLayer.Style)) {
            if (capabilityLayer.Style.length > 0) {
                _styles = capabilityLayer.Style;
            }
        }
        return _styles;
    }

    function createTileGrid(extent, tileSize) {
        var maxResolution = ol.extent.getWidth(extent) / (tileSize[0] * 2);
        var resolutions = new Array(29); // the ol.View object has 29 zoom levels by default
        for (var i = 0, len = resolutions.length; i < len; i++) {
            resolutions[i] = maxResolution / Math.pow(2, i);
        }

        // Create tile grid.
        return new ol.tilegrid.TileGrid({
            origin: [extent[0], extent[1]],
            resolutions: resolutions,
            tileSize: [tileSize[0], tileSize[1]]
        });
    }

    /**
     * Recursivly run hover Layer params and merge top to bottom on Layer.Name match
     * @param {Capabilities.layerWMS} layers    -   The layer capabilities object to check
     * @param {String} name - Layer Name wanted
     * @returns {Capabilities.layerWMS|undefined}    The Layer Object for the given layer name or undefined if not found
     * @private
     */
    function loopHoverLayers(layers, name) {
        var _layers = angular.isArray(layers) ? layers : [layers];

        // For each layers
        for (var i = 0, length = _layers.length; i < length; i++) {
            var layer = angular.copy(_layers[i]);

            if (angular.isArray(layer.CRS)) {
                layer.CRS = layer.CRS.filter(function(crs) {
                    return angular.isDefined(ol.proj.get(crs));
                });
            } else if (angular.isArray(layer.SRS)) {
                layer.SRS = layer.SRS.filter(function(crs) {
                    return angular.isDefined(ol.proj.get(crs));
                });
            }

            // We found the layer, stop here
            if (layer.Name === name) {
                return layer;
            }

            // If it has subLayers, try to find the wanted layer in
            if (layer.Layer) {
                var _l = loopHoverLayers(layer.Layer, name);

                // If we found the layer in subLayer, add current to the stack and return
                if (angular.isObject(_l) && !angular.isArray(_l)) {
                    // No inheritance for these properties
                    delete layer.Layer;
                    delete layer.Name;
                    delete layer.Title;
                    delete layer.Abstract;
                    delete layer.KeywordList;
                    delete layer.Identifier;
                    delete layer.MetadataURL;
                    delete layer.DataURL;
                    delete layer.FeatureListURL;
                    return Utils.merge({}, layer, _l);
                }
            }
        }

        return undefined;
    }

    /**
     *
     * @param {Capabilities.layerWMS} layer - The layer capabilities object
     * @param {Capabilities.layerWMS|undefined} parent - The layer parent capabilities object to merge
     * @returns {Array.<Capabilities.layerWMS>} Computed layers list from layer capabilities object
     */
    function listLayers(layer, parent) {
        var layers = [];

        var _layer = Utils.merge({}, parent || {}, layer);

        if (angular.isArray(_layer.CRS)) {
            _layer.CRS = _layer.CRS.filter(function(crs) {
                return angular.isDefined(ol.proj.get(crs));
            });
        } else if (angular.isArray(_layer.SRS)) {
            _layer.SRS = _layer.SRS.filter(function(crs) {
                return angular.isDefined(ol.proj.get(crs));
            });
        }

        if (angular.isArray(_layer.Layer) && _layer.Layer.length > 0) {

            var _parent = angular.copy(_layer);

            // No inheritance for these properties
            delete _parent.Layer;
            delete _parent.Name;
            delete _parent.Title;
            delete _parent.Abstract;
            delete _parent.KeywordList;
            delete _parent.Identifier;
            delete _parent.MetadataURL;
            delete _parent.DataURL;
            delete _parent.FeatureListURL;

            angular.forEach(layer.Layer, function (child) {
                layers = layers.concat(listLayers(child, _parent));
            });
        }

        if (angular.isDefined(_layer.Name)) {
            layers.unshift(_layer);
        }

        return layers;
    }

    /**
     * @description Compute options to create an ol.layer with an {@link ol.source.TileWMS} from a {@link Capabilities.root}
     *
     * @param {Capabilities.root}       capabilities
     * @param {Object}                  options             - Wanted options. All unknown options will be added to the returned params object
     * @param {String}                  options.LAYERS      - The wanted layer.Name
     * @param {Object}                  [options.SOURCE]    - Extra params for {@link ol.source.TileWMS} constructor
     * @param {Object}                  [options.PARAMS]    - Extra params for {@link ol.source.TileWMS} params constructor attribute
     * @param {String|ol.extent.Extent} [options.BBOX]      - The wanted BBOX in CRS:84 as String like WMS GetMap BBOX Format of as an Array of four elements as [minLon,minLat,maxLon,maxLat]
     * @param {String|Array.<String>}   [options.SRS]       - For capabilities.version === '1.1.1'. The wanted projection or an array of the wanted projection in order
     * @param {String|Array.<String>}   [options.CRS]       - For capabilities.version === '1.3.0'. The wanted projection or an array of the wanted projection in order
     * @param {String|Array.<String>}   [options.STYLES]    - The wanted STYLES or an array of the wanted style in order
     * @param {String|Array.<String>}   [options.FORMATS]   - The wanted FORMAT or an array of the wanted formats in order
     * @param {String|Number}           [options.HEIGHT]    - The wanted height for tile size
     * @param {String|Number}           [options.WIDTH]     - The wanted width for tile size
     *
     * @return {Object} An object with all parameters created from capabilities to create an ol.layer
     *
     * @throws Error if options.LAYERS is not defined or not found on capabilities object
     * @throws Error if wanted projection was not found or none projection was supported
     * @throws Error if GetMap url was not found on capabilities object
     */
    self.createLayerTileWMSParams = function(capabilities, options) {
        var opts = angular.copy(options);
        var params = opts.PARAMS || {};

        delete opts.PARAMS;

        var capabilityLayer = self.findCapabilityLayer(capabilities, opts.LAYERS);
        if (!angular.isObject(capabilityLayer)) {
            throw new Error("The layer "+opts.LAYERS+" was not found on the capability document");
        }
        delete opts.LAYERS;

        var urls = self.getMapUrls(capabilities);
        var capabilityUrl = capabilities.url || self.getCapabilitiesUrl(capabilities);

        // Get and compute projection
        var projection = getProjectionOf(capabilityLayer, opts.CRS||opts.SRS);
        delete opts.CRS;
        delete opts.SRS;

        // Compute max extent for this layer
        if (angular.isString(opts.BBOX)) {
            opts.BBOX = opts.BBOX.split(",");
            if (opts.BBOX.length === 4) {
                opts.BBOX = [parseFloat(opts.BBOX[0]), parseFloat(opts.BBOX[1]), parseFloat(opts.BBOX[2]), parseFloat(opts.BBOX[3])];
            }
        }
        if (angular.isArray(opts.BBOX) && opts.BBOX.length === 4) {
            opts.BBOX = ol.proj.transformExtent(opts.BBOX, "CRS:84", projection);
        }
        var extent = getExtentOf(capabilityLayer, projection, opts.BBOX);
        delete opts.BBOX;

        var dimensions = getDimensionsOf(capabilityLayer);

        // Compute default dimension parameters and check if given wanted dimension exist on GetCapabilities
        angular.forEach(dimensions, function(dimension, name) {
            if (angular.isDefined(params[name])) {
                if (dimension.values.indexOf(params[name]) < 0) {
                    delete params[name];
                }
            }
            if (angular.isDefined(dimension.default)) {
                params[name] = dimension.default;
            }
        });

        var styles = getStylesOf(capabilityLayer);
        var style = "";
        if (angular.isString(opts.STYLES) && opts.STYLES.length > 0) {
            style = getWantedIn(styles, opts.STYLES, undefined, function (list, name) {
                    for (var i = 0, lg = list.length; i < lg; i++) {
                        if (list[i].Name === name) {
                            return true;
                        }
                    }
                    return false;
                });
            style = style.Name;
        }
        delete opts.STYLES;

        var formats = getFormatsOf(capabilities);
        var format = getWantedIn(formats, opts.FORMATS || []);
        if (!format) {
            format = formats[0];
        }
        if (!format) {
            format = "image/png";
        }
        delete opts.FORMATS;

        var width = 256, height = 256;
        if (angular.isDefined(opts.HEIGHT)) {
            var _h = parseInt(opts.HEIGHT);
            if (angular.isNumber(_h)) {
                height = _h;
            }
            // TODO : Check in GetCapabilities min/max size
        }
        delete opts.HEIGHT;
        if (angular.isDefined(opts.WIDTH)) {
            var _w = parseInt(opts.WIDTH);
            if (angular.isNumber(_w)) {
                width = _w;
            }
            // TODO : Check in GetCapabilities min/max size
        }
        delete opts.WIDTH;

        var source_params = angular.extend({}, opts.SOURCE);
        if (urls.length > 1) {
            source_params.urls = urls;
        } else {
            source_params.url = urls[0];
        }
        delete opts.SOURCE;

        return angular.extend(opts, {
            title: capabilityLayer.Title,
            //publisher: entry.publisher, // TODO : compute publisher from GetCapabilities
            extent: extent,
            projection: projection,
            minResolution : undefined, // TODO : extract minResolution from GetCapabilities
            maxResolution : undefined, // TODO : extract maxResolution from GetCapabilities

            capability : capabilityLayer,
            capabilityUrl : capabilityUrl,
            dimensions : dimensions,
            styles: styles,

            source: new ol.source.TileWMS(angular.extend(source_params,{
                params: angular.extend({}, params, {
                    STYLES: style,
                    LAYERS: capabilityLayer.Name,
                    FORMAT: format
                }),
                projection: projection,
                crossOrigin: 'anonymous',
                attributions: [], // TODO extract attributions from GetCapabilities
                logo: undefined, // TODO extract logo from GetCapabilities
                tileGrid: createTileGrid(projection.getWorldExtent(), [width, height])
            }))
        });
    };

    /**
     *
     * @param {Capabilities.root}      capabilities    -   Parsing capabilities document
     * @param {String}      name            -   The layer name wanted
     * @returns {Capabilities.layer|undefined}    The Layer Object for the given layer name or undefined if not found
     */
    self.findCapabilityLayer = function(capabilities, name) {
        if (capabilities && capabilities.Capability && capabilities.Capability.Layer) {
            return loopHoverLayers(capabilities.Capability.Layer, name);
        }
        return undefined;
    };

    /**
     * Returns an array that contains all layers from the capabilities document.
     * @param {Capabilities.root}      capabilities    -   Parsing capabilities document.
     * @returns {Array}     The array of all layers in given capabilities
     */
    self.getCapabilityLayers = function(capabilities) {
        if (capabilities && capabilities.Capability && capabilities.Capability.Layer) {
            return listLayers(capabilities.Capability.Layer);
        }
        return [];
    };

    /**
     *
     * @param   {Capabilities.root}   capabilities
     * @returns {Array.<String>} GetMap urls from Capabilities object
     * @throws Error if GetMap url was not found on capabilities
     */
    self.getMapUrls = function(capabilities) {
        var urls = [];
        if (capabilities.Capability &&
            capabilities.Capability.Request &&
            capabilities.Capability.Request.GetMap &&
            capabilities.Capability.Request.GetMap.DCPType) {
            angular.forEach(capabilities.Capability.Request.GetMap.DCPType, function(dcpType) {
                if (dcpType.HTTP &&
                    dcpType.HTTP.Get &&
                    dcpType.HTTP.Get.OnlineResource) {
                    urls.push(dcpType.HTTP.Get.OnlineResource);
                }
            });
        }
        if (urls.length <= 0) {
            throw new Error("Unable to find the GetMap url on "+capabilities.Service.Title);
        }
        return urls;
    };

    /**
     *
     * @param   {Capabilities.root}   capabilities
     * @returns {String} GetCapabilities url from Capabilities object
     */
    self.getCapabilitiesUrl = function(capabilities) {
        var capabilityUrl = {};
        if (capabilities.Capability &&
            capabilities.Capability.Request &&
            capabilities.Capability.Request.GetCapabilities &&
            capabilities.Capability.Request.GetCapabilities.DCPType) {
            var dcpType = capabilities.Capability.Request.GetCapabilities.DCPType[0];
            if (dcpType.HTTP &&
                dcpType.HTTP.Get &&
                dcpType.HTTP.Get.OnlineResource) {
                capabilityUrl = Utils.parseParams(dcpType.HTTP.Get.OnlineResource);
                // TODO fill params only with endPoint, no RestFULL
                capabilityUrl.params.REQUEST = Capabilities.RequestParam;
                capabilityUrl.params.SERVICE = Capabilities.OGCService.WMS;
                capabilityUrl.params.VERSION = capabilities.version;
            }
        }
        return Utils.computeUrl(capabilityUrl.url, capabilityUrl.params);
    };

    /**
     * @description
     *
     * @param {Capabilities.root}       capabilities
     * @param {Capabilities.layer}      layer
     * @param {Object}                  [opts]
     * @param {Object}                  [opts.PARAMS]  -   The wanted projection or an array of the wanted projection in order
     * @param {String|Array.<String>}   [opts.CRS]     -   The wanted projection or an array of the wanted projection in order
     * @param {Array.<Number>}          [opts.BBOX]    -   BBOX with projection in CRS:84
     * @param {Number}                  [opts.WIDTH]   -   GetMap Width
     * @param {Number}                  [opts.HEIGHT]  -   GetMap Height
     * @param {String|Array.<String>}   [opts.STYLES]  -   The wanted STYLES or an array of the wanted style in order
     * @param {String|Array.<String>}   [opts.FORMATS] -   The wanted FORMAT or an array of the wanted formats in order
     *
     * @throws Error if GetMap url was not found on the capabilities object
     */
    self.getOverviewUrl = function(capabilities, layer, opts) {
        var _opts = angular.copy(opts || {});
        var params = {};

        var url = self.getMapUrls(capabilities);
        if (angular.isArray(url) && url.length > 0) {
            url = url[0];
        }

        var projection = getProjectionOf(layer, _opts.CRS);
        if (capabilities.version === self.VERSION.v1_1_1) {
            params.SRS = projection.getCode();
        } else {
            params.CRS = projection.getCode();
        }

        if (angular.isArray(_opts.BBOX) && _opts.BBOX.length === 4) {
            _opts.BBOX = ol.proj.transformExtent(_opts.BBOX, "CRS:84", projection);
        } else {
            delete _opts.BBOX;
        }
        var extent = getExtentOf(layer, projection, _opts.BBOX);

        var axisOrientation = "enu";
        if (typeof projection.getAxisOrientation === "function" && projection.getAxisOrientation().substr(0, 2) === 'ne') { // ne == lattitude/longitude
            axisOrientation = projection.getAxisOrientation();
        } else {
            var proj4crs = proj4.defs(projection.getCode());
            axisOrientation = proj4crs ? (proj4crs.axis || "enu"): "enu";
        }

        if (capabilities.version === "1.3.0" && axisOrientation.substr(0, 2) === 'ne') {
            params.BBOX = [extent[1], extent[0], extent[3], extent[2]];
        } else {
            params.BBOX = extent;
        }

        params.BBOX = params.BBOX.join(",");

        params.WIDTH = _opts.WIDTH || 256;
        params.HEIGHT = _opts.HEIGHT || 256;

        var styles = getStylesOf(layer);
        var style = "";
        if (angular.isString(_opts.STYLES) && _opts.STYLES.length > 0) {
            style = getWantedIn(styles, _opts.STYLES, undefined, function (list, name) {
                for (var i = 0, lg = list.length; i < lg; i++) {
                    if (list[i].Name === name) {
                        return true;
                    }
                }
                return false;
            });
            params.STYLES = style.Name;
        } else {
            params.STYLES = "";
        }

        var formats = getFormatsOf(capabilities);
        params.FORMAT = getWantedIn(formats, _opts.FORMATS || []);
        if (!params.FORMAT) {
            params.FORMAT = formats[0];
        }
        if (!params.FORMAT) {
            params.FORMAT = "image/png";
        }
        delete _opts.FORMATS;

        return Utils.computeUrl(url, angular.extend({}, _opts.PARAMS, {
            SERVICE : Capabilities.OGCService.WMS,
            VERSION : capabilities.version,
            REQUEST : "GetMap",
            LAYERS : layer.Name,
            TRANSPARENT : "TRUE"
        }, params));
    };
}

/**
 * @namespace ol-webmapservice
 *
 * @requires ng
 * @requires airbus.shared.utils
 * @requires ol-capabilities
 */
angular.module("ol-webmapservice", ["ng", "airbus.shared.utils", "ol-capabilities"])
    .service("WebMapService", WebMapService_);