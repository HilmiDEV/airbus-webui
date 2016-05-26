/**
 * @ngdoc controller
 *
 * @param {MainMapDriverService} mainMapDriver
 */
function LayersPanelController(mainMapDriver) {

    var self = this;


    self.opacitySliderOptions = {
        floor: 0,
        ceil: 1,
        precision: 2,
        step: 0.05
    };

    self.gammaSliderOptions = {
        floor: 0.1,
        ceil: 3,
        precision: 1,
        step: 0.1
    };

    self.collection = function() {
        return mainMapDriver.getPublicLayers();
    };

    self.zoomToLayer = function(layer) {
        mainMapDriver.zoomToLayer(layer);
    };
}

/**
 * @ngdoc directive
 */
function layersPanelDirective() {
    return {
        restrict: 'E',
        require: '^rightPanel',
        scope: true,
        controller: LayersPanelController,
        controllerAs: 'layersCtrl',
        templateUrl: 'components/right-panel/layers-panel/layers-panel.html'
    };
}

/**
 * @ngdoc directive
 * @name olLayerOverview
 *
 * @param {Capabilities} Capabilities
 * @param {WebMapService} WebMapService
 * @param {Utils} Utils
 *
 * @TODO - Move it elsewhere ?
 */
function olLayerOverviewDirective(Capabilities, WebMapService, Utils) {

    function linkOlLayerOverview(scope, element, attrs) {

        // Watch directive expression.
        scope.$watch(attrs.olLayerOverview, function(layer) {

            // Check if provided object is an ol.layer.Layer and provide us a capabilitiesUrl
            if (layer instanceof ol.layer.Layer && angular.isString(layer.get("capabilityUrl"))) {

                // Perform GetCapabilities request in order to compute overview URL.
                var promise = Capabilities.get(layer.get("capabilityUrl"));

                // TODO - Set loading image on loading.

                // Compute and set image source on success.
                promise.then(function (capabilities) {
                    var source = layer.get("original_source") || layer.getSource();

                    if (source instanceof ol.source.TileWMS || source instanceof ol.source.ImageWMS) {
                        var capabilityLayer = layer.get("capability") || WebMapService.findCapabilityLayer(capabilities, source.getParams().LAYERS);

                        element.attr('src', WebMapService.getOverviewUrl(capabilities,capabilityLayer,{
                            CRS : ["EPSG:4326","CRS:84","EPSG:3857"],
                            FORMATS : ["image/jpeg", "image/png"],
                            WIDTH : 150,
                            HEIGHT : 75
                        }));
                    } else {
                        throw new Error("The layer "+layer.get("title")+" has not a WMS source");
                    }

                }).catch(function(error) {
                    // TODO - Set error image on failure.
                    element.attr('src', '');
                });
            } else {
                // TODO - Set error image on failure.
                element.attr('src', '');
            }
        });
    }

    return {
        restrict: 'A',
        link: linkOlLayerOverview
    };
}

/**
 * @namespace airbus.components.rightPanel.layersPanel
 * @requires ng
 * @requires ol-capabilities
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.olRepeat
 * @requires airbus.shared.utils
 */
angular.module('airbus.components.rightPanel.layersPanel', [
    'ng',
    'ol-capabilities',
    'airbus.shared.mainMap',
    'airbus.shared.olRepeat',
    'airbus.shared.utils'
]).directive('layersPanel', layersPanelDirective).directive('olLayerOverview', olLayerOverviewDirective);