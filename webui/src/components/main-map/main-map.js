/**
 * @ngdoc controller
 * @name MapController
 * @alias mapCtrl
 *
 * @description Controller for {@link mainMap}
 *
 * @param {MainMapDriverService} mainMapDriver
 * @param {Object} olMap
 *
 * @this MapController
 */
function MapController(mainMapDriver,olMap) {

    var self = this;

    function proceedToGetFeatureInfo(scope, event, model) {
        //get coordinates from pixel
        olMap.get('main').then(function(map) {

            var pixel = map.getEventPixel(event);
            var coords = map.getCoordinateFromPixel(pixel);
            var layers = mainMapDriver.getPublicLayers();

            // getFeatureInfo for each visible WMS layers
            layers.forEach(function(lay,idx,arry){
                var source = lay.get("original_source");
                if(source instanceof ol.source.TileWMS && lay.getVisible()) {
                    var viewResolution = map.getView().getResolution();
                    var url = source.getGetFeatureInfoUrl(
                        coords, viewResolution, map.getView().getProjection(),
                        {'INFO_FORMAT': 'text/html'});
                    console.debug(url);
                    //TODO remove once AW-46 will be fixed
                    window.open(url);
                }
            });

        });
    }
    self.menuOptions = [
        ['Information on this point', proceedToGetFeatureInfo]
    ];
}

/**
 * @ngdoc directive
 * @name mainMap
 *
 * @description
 */
function mainMapDirective() {
    return {
        restrict: 'E',
        scope: true,
        controller: MapController,
        controllerAs: 'mapCtrl',
        templateUrl: 'components/main-map/main-map.html'
    };
}

/**
 * @namespace airbus.components.mainMap
 * @requires ng
 * @requires airbus.shared.mainMap
 */
angular.module('airbus.components.mainMap', [
    'ng',
    'ol',
    'airbus.shared.mainMap'
]).directive('mainMap', mainMapDirective);