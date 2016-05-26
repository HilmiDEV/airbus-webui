/**
 * @ngdoc controller
 *
 * @param {Object} notify
 * @param {Capabilities} Capabilities
 * @param {WebMapService} WebMapService
 * @param {WebMapTileService} WebMapTileService
 * @param {Utils} Utils
 * @param {RightPanelDriverService} rightPanelDriver
 * @param {MainMapDriverService} mainMapDriver
 */
function SourcePanelController(notify, Capabilities, WebMapService, WebMapTileService, Utils, rightPanelDriver, mainMapDriver) {

    var self = this;

    self.urlRegExp=/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;
    self.url = '';
    self.layersType = "";
    self.availableLayers = [];
    self.showLoader = false;

    self.selected = [];

    self.select = function(layer) {
        var index = self.selected.indexOf(layer);
        if (index === -1) {
            self.selected.push(layer);
        } else {
            self.selected.splice(index, 1);
        }
    };

    self.isSelected = function(layer) {
        return self.selected.indexOf(layer) !== -1;
    };

    self.loadLayersFromUrl = function() {
        self.showLoader = true;
        // get params object
        var objParams = Utils.parseParams(self.url,true);

        var toSend = angular.extend(objParams.params, {
            URL : objParams.url,
            REQUEST: Capabilities.RequestParam
        });

        /**
         *
         * @param {Capabilities.root} capabilities
         */


        // send first request GetCapabilities in 1.3.0,
        // if fails then try with 1.1.1, otherwise try the case without specifying the version.
        Capabilities.get([
            angular.extend({}, toSend, {
                SERVICE : Capabilities.OGCService.WMTS,
                VERSION : WebMapTileService.VERSION.v1_0_0
            }),
            angular.extend({}, toSend, {
                SERVICE : Capabilities.OGCService.WMS,
                VERSION : WebMapService.VERSION.v1_3_0
            }),
            angular.extend({}, toSend, {
                SERVICE : Capabilities.OGCService.WMS,
                VERSION : WebMapService.VERSION.v1_1_1
            })
        ]).catch(function (error){
                // Notify user.
                notify.warn('An error occurred, cannot load Capabilities document!', 5000);
                console.debug(error);
                self.showLoader = false;
        }).then(function fetchLayers(capabilities) {
            if (capabilities && capabilities.type === Capabilities.OGCService.WMS) {
                // WMS serveur

                self.layersType = Capabilities.OGCService.WMS;
                self.availableLayers = WebMapService.getCapabilityLayers(capabilities);

                angular.forEach(self.availableLayers, function (layer) {
                    layer.capabilityUrl = capabilities.url;
                    layer.overviewUrl = WebMapService.getOverviewUrl(capabilities, layer, {
                        CRS : ["EPSG:4326","CRS:84","EPSG:3857"],
                        FORMATS : ["image/jpeg", "image/png"],
                        WIDTH : 150,
                        HEIGHT : 75
                    });
                });
            } else if (capabilities && capabilities.type === Capabilities.OGCService.WMTS) {
                self.layersType = Capabilities.OGCService.WMTS;
                self.availableLayers = WebMapTileService.getCapabilityLayers(capabilities);

                angular.forEach(self.availableLayers, function (layer) {
                    layer.capabilityUrl = capabilities.url;
                });
            }

        })['finally'](function() {
            self.showLoader = false;
        });
    };

    self.addLayers = function() {

        switch (self.layersType) {
            case Capabilities.OGCService.WMS :
                angular.forEach(self.selected, function (layer) {
                    var capabilityUrl = layer.capabilityUrl;
                    var parsed = Utils.parseParams(layer.overviewUrl, true),
                        params = angular.extend(parsed.params, {TRANSPARENT: 'true'});

                    // Remove GetMap specific parameters.
                    delete params.REQUEST;
                    delete params.HEIGHT;
                    delete params.WIDTH;

                    mainMapDriver.addPublicWMSLayer(capabilityUrl, params);
                });
                break;

            case Capabilities.OGCService.WMTS :
                angular.forEach(self.selected, function (layer) {
                    var capabilityUrl = layer.capabilityUrl;

                    mainMapDriver.addPublicWMTSLayer(capabilityUrl, {
                        LAYERS : layer.Identifier
                    });
                });
                break;
            default :
                console.error("Unsupported service " + self.layersType);
        }
        rightPanelDriver.close();
    };
}

/**
 * @ngdoc directive
 */
function sourcePanelDirective() {
    return {
        restrict: 'E',
        require: '^rightPanel',
        scope: true,
        controller: SourcePanelController,
        controllerAs: 'sourceCtrl',
        templateUrl: 'components/right-panel/source-panel/source-panel.html'
    };
}

/**
 * @namespace airbus.components.rightPanel.sourcePanel
 * @requires ng
 * @requires notify
 * @requires ol-capabilities
 * @requires airbus.shared.utils
 */
angular.module('airbus.components.rightPanel.sourcePanel', [
    'ng',
    'notify',
    'ol-capabilities',
    'ol-webmapservice',
    'ol-webmaptileservice',
    'airbus.shared.utils'
]).directive('sourcePanel', sourcePanelDirective);