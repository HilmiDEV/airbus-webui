/**
 * @ngdoc service
 *
 * @param {$q} $q
 * @param {Object} settingsService
 * @param {Utils} Utils
 * @param {Capabilities} Capabilities
 * @param {WebMapService} WebMapService
 * @param {WebMapTileService} WebMapTileService
 */
function MainMapFactoryService($q, mainMapView, settingsService, Utils, Capabilities, WebMapService, WebMapTileService) {

    var self = this;

    self.createLayer = function(layerModel) {
        return getCapabilities(layerModel.source).then(function(capabilities) {
            return createLayer(layerModel, capabilities);
        });
    };


    function getDefaultLayerOptions() {
        var settings = settingsService.getValue();

        // Create default layer options from settings.
        return angular.extend({
            visible: true,
            opacity: 1
        }, settings.correction);
    }

    function getCapabilities(sourceModel) {
        switch(sourceModel.type) {
            case 'WMS':
            case 'TileWMS':
                return Capabilities.get([
                    angular.extend({}, {
                        URL: sourceModel.url,
                        SERVICE: Capabilities.OGCService.WMS,
                        VERSION: sourceModel.params.version
                    }),
                    angular.extend({}, {
                        URL: sourceModel.url,
                        SERVICE: Capabilities.OGCService.WMS,
                        VERSION: WebMapService.VERSION.v1_3_0
                    }),
                    angular.extend({}, {
                        URL: sourceModel.url,
                        SERVICE: Capabilities.OGCService.WMS,
                        VERSION: WebMapService.VERSION.v1_1_1
                    })
                ]);
            case 'WMTS':
                return Capabilities.get([
                    angular.extend({}, {
                        URL: sourceModel.url,
                        SERVICE: Capabilities.OGCService.WMTS,
                        VERSION: sourceModel.params.version
                    }),
                    angular.extend({}, {
                        URL: sourceModel.url,
                        SERVICE: Capabilities.OGCService.WMTS,
                        VERSION: WebMapTileService.VERSION.v1_0_0
                    })
                ]);
            default:
                return $q.when();
        }
    }

    function createSourceRasterGamma(source, layer) {
        var raster = new ol.source.Raster({
            sources: [source],
            /**
             * Run calculations on pixel data.
             * @param {Array} pixels List of pixels (one per source).
             * @param {Object} data User data object.
             * @return {Array} The output pixel.
             */
            operation: function(pixels, data) {
                var pixel = pixels[0];

                if (data.gamma <= 0.0 || data.gamma === 1.0) {
                    return pixel;
                } else {
                    return [
                        Math.pow(pixel[0],data.gamma_den)*data.gamma_max,
                        Math.pow(pixel[1],data.gamma_den)*data.gamma_max,
                        Math.pow(pixel[2],data.gamma_den)*data.gamma_max,
                        pixel[3]
                    ];
                }
            },
            /**
             * List of functions to be available in a web worker
             */
            lib: {},
            threads: 1,
            operationType: 'pixel'
        });

        raster.on('beforeoperations', function(event) {
            event.data.gamma = layer.get('gamma') || 1.0;
            event.data.gamma_den = 1.0/event.data.gamma;
            event.data.gamma_max = Math.pow(255,(1-event.data.gamma_den));
        });

        source.on("change", function(event) {
            raster.changed();
        });

        return raster;
    }

    function createSourceRasterHistogram(source, layer) {
        var raster = new ol.source.Raster({
            sources: [source],
            /**
             * Run calculations on pixel data.
             * @param {Array} pixels List of pixels (one per source).
             * @param {Object} data User data object.
             * @return {Array} The output pixel.
             */
            operation: function(pixels, data) {
                var pixel = pixels[0];

                if (data.rad_min <= 0 && 255.0 <= data.rad_max) {
                    return pixel;
                }

                var grey = (pixel[0]+pixel[1]+pixel[2])/3.0;

                if (grey < data.rad_min) {
                    pixel[0] = 0.0;
                    pixel[1] = 0.0;
                    pixel[2] = 0.0;
                } else if (data.rad_max < grey) {
                    pixel[0] = 255.0;
                    pixel[1] = 255.0;
                    pixel[2] = 255.0;
                } else {
                    pixel[0] = ((pixel[0] - data.rad_min) * data.scale) + data.min;
                    pixel[1] = ((pixel[1] - data.rad_min) * data.scale) + data.min;
                    pixel[2] = ((pixel[2] - data.rad_min) * data.scale) + data.min;
                }
                return pixel;
            },
            /**
             * List of functions to be available in a web worker
             */
            lib: {},
            threads: 1,
            operationType: 'pixel'
        });

        raster.on('beforeoperations', function(event) {
            event.data.min = 0;
            event.data.max = 255;
            var width = event.data.max-event.data.min;

            var radiometric = [layer.get('rad_min') || 0.0, layer.get('rad_max') || 100.0];

            var _min = event.data.min + (radiometric[0]/100)*width;
            var _max = event.data.min + (radiometric[1]/100)*width;

            event.data.rad_min = Math.max(Math.min(_min, _max), 0.0);
            event.data.rad_max = Math.min(Math.max(_min, _max), 255.0);
            var rad_width = event.data.rad_max - event.data.rad_min;

            event.data.scale = width / rad_width;
        });

        source.on("change", function(event) {
            raster.changed();
        });

        return raster;
    }

    function createLayer(layerModel, capabilities) {
        var layerOptions = angular.extend(getDefaultLayerOptions(), layerModel);

        // Create source from capabilities.
        switch(layerModel.source.type) {
            case 'WMS':
            case 'TileWMS':
                layerModel.source.params = Utils.upperCaseKeys(layerModel.source.params);
                var params = angular.copy(layerModel.source.params);
                delete params.LAYERS;
                delete params.STYLES;
                layerOptions = angular.extend(layerOptions, WebMapService.createLayerTileWMSParams(capabilities, {
                    LAYERS : layerModel.source.params.LAYERS,
                    SOURCE : {
                        wrapX: true
                    },
                    STYLES : layerModel.source.params.STYLES,
                    PARAMS : params,
                    HEIGHT : layerModel.source.tileSize || 256,
                    WIDTH : layerModel.source.tileSize || 256,
                    CRS : ["CRS:84", "EPSG:4326", "EPSG:3857"]
                }));
                break;
            case 'WMTS':
                layerOptions = angular.extend(layerOptions, WebMapTileService.createLayerParams(capabilities, {
                   SOURCE : {
                       wrapX: true,
                       layer : layerModel.source.params.LAYERS
                   }
                }));
                break;
            default:
                throw new Error('Unsupported source type : ' + layerModel.source.type);
        }

        // Create layer instance.
        var layer = new ol.layer.Image(layerOptions);

        layer.set("original_source", layer.getSource());
        layer.setSource(createSourceRasterGamma(createSourceRasterHistogram(layer.getSource(), layer), layer));

        layer.on("propertychange", function(event) {
            if (["gamma", "rad_min", "rad_max"].indexOf(event.key) !== -1) {
                var source = layer.get("original_source");
                if (source instanceof ol.source.Source) {
                    source.changed();
                }
            }
        });
        return layer;
    }
}

function mainMapView(settingsService, olMap) {

    var settings = settingsService.getValue();

    var view = new ol.View({
        projection: settings.basemap.projection
    });

    // Called on first map render to zoom on configured extent. This action
    // can be performed before the first map render because wa have to call
    // the "getSize" method on map instance.
    olMap.get('main').then(function(map) {
        var extent = settings.basemap.extent;
        view.fit(extent, map.getSize(), { nearest: true });
    });

    return view;
}

    /**
     * @ngdoc service
     *
     * @param {$timeout} $timeout
     * @param {Object} settingsService
     * @param {mainMapView} mainMapView
     * @param {MainMapFactoryService} mainMapFactory
     * @param {Object} olMap
     * @param {Object} notify
     */
function mainMapOptionsFactory($timeout, settingsService, mainMapView, mainMapFactory, olMap, notify) {

    var settings = settingsService.getValue();

    return {
        view: mainMapView,
        layers: createLayers(),
        controls: createControls(),
        interactions: createInteractions()
    };

    function createLayers() {
        // Appears in layer control.
        var publicLayers = new ol.layer.Group({
            title: 'Public',
            layers: []
        });

        // Does not appear in layer control.
        var privateLayers = new ol.layer.Group({
            title: 'Private',
            layers: []
        });

        // Create basemap layer from settings.
        var layerPromise = mainMapFactory.createLayer({ source: settings.basemap.source })
            .then(function successCallback(layer) {
                publicLayers.getLayers().insertAt(0, layer);
            })
            .catch(function failureCallback() {
                notify.error('Can\'t get layer capabilities. Please check your basemap settings.', 10000);
            });

        // Wrap loading notification in a $timeout callback because the related
        // directive may not be rendered at this point.
        $timeout(function notifyCapabilitiesLoading() {
            notify.loading('Getting layer capabilities...', layerPromise);
        }, 0, false);

        return new ol.Collection([publicLayers, privateLayers]);
    }

    function createControls() {
        // Just return an empty collection. Control are added through directives.
        return new ol.Collection();
    }

    function createInteractions() {
        return ol.interaction.defaults();
    }
}

/**
 * @ngdoc service
 *
 * @param {Object} settingsService
 * @param {Object} mainMapOptions
 * @param {MainMapFactoryService} mainMapFactory
 * @param {Object} olMap
 */
function MainMapDriverService(settingsService, mainMapOptions, mainMapFactory, olMap) {

    var self = this;

    var publicLayers = mainMapOptions.layers.item(0).getLayers();

    var privateLayers = mainMapOptions.layers.item(1).getLayers();

    // View
    // ----------

    self.zoomByDelta = function(delta) {
        olMap.get('main').then(function(map) {
            var view = map.getView(),
                resolution = view.getResolution();

            map.beforeRender(ol.animation.zoom({
                resolution: resolution,
                duration: 250,
                easing: ol.easing.easeOut
            }));
            view.setResolution(view.constrainResolution(resolution, delta));
        });
    };

    self.zoomToLayer = function(layer) {
        var extent = layer.getExtent();
        if (angular.isArray(extent) && extent.length === 4) {
            var source = layer.get('projection'),
                target = settingsService.getValue().basemap.projection;

            // Ensure layer extent is expressed in the same projection than the map.
            self.zoomToExtent(ol.proj.transformExtent(extent, source, target));
        }
    };

    self.zoomToExtent = function(extent) {
        if (angular.isUndefined(extent)) {
            // Fallback on settings extent if no extent was provided.
            extent = settingsService.getValue().basemap.extent;
        }

        olMap.get('main').then(function(map) {
            // Perform zoom to extent.
            map.getView().fit(extent, map.getSize(), { nearest: true });
        });
    };

    self.setRotation = function(rotation) {
        mainMapOptions.view.setRotation(rotation);
    };

    // Layers
    // ----------

    self.reloadBasemapLayer = function() {
        var sourceModel = settingsService.getValue().basemap.source,
            layerModel = { source: sourceModel };

        return mainMapFactory.createLayer(layerModel).then(function(layer) {
            publicLayers.setAt(0, layer);
        });
    };

    self.getPublicLayers = function() {
        return publicLayers;
    };

    self.getPublicLayerById = function(id) {
        return publicLayers.getArray().filter(function(layer) {
            return layer.get('id') === id;
        })[0];
    };

    self.addPublicWMSLayer = function(url, params) {
        var sourceModel = { type: 'TileWMS', url: url, params: params },
            layerModel = { source: sourceModel };

        return mainMapFactory.createLayer(layerModel).then(function(layer) {
            publicLayers.push(layer);
        });
    };

    self.addPublicWMTSLayer = function(url, params) {
        var sourceModel = { type: 'WMTS', url: url, params: params },
            layerModel = { source: sourceModel };

        return mainMapFactory.createLayer(layerModel).then(function(layer) {
            publicLayers.push(layer);
        });
    };

    self.getPrivateLayers = function() {
        return privateLayers;
    };

    // Controls
    // ----------

    self.addControl = function(control) {
        mainMapOptions.controls.push(control);
    };

    self.removeControl = function(control) {
         mainMapOptions.controls.remove(control);
    };

    // Interactions
    // ----------

    self.addInteraction = function(interaction) {
        mainMapOptions.interactions.push(interaction);
    };

    self.removeInteraction = function(interaction) {
        mainMapOptions.interactions.remove(interaction);
    };
}

/**
 * @namespace airbus.shared.mainMap
 * @requires ng
 * @requires notify
 * @requires ol
 * @requires ol-capabilities
 * @requires airbus.shared.settings
 * @requires airbus.shared.utils
 */
angular.module('airbus.shared.mainMap', ['ng', 'notify', 'ol', 'ol-capabilities', 'ol-webmapservice', 'airbus.shared.settings', 'airbus.shared.utils'])
    .service('mainMapFactory', MainMapFactoryService)
    .factory('mainMapOptions', mainMapOptionsFactory)
    .service('mainMapView', mainMapView)
    .service('mainMapDriver', MainMapDriverService);

