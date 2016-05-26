/**
 * @ngdoc controller
 */
function MousePositionController() {

    var self = this;


    self.projections = ['EPSG:4326', 'EPSG:32719', 'EPSG:32720'];

    self.selected = self.projections[0];


    self.getSelected = function() {
        return self.selected;
    };
}

/**
 * @ngdoc directive
 *
 * @param {MainMapDriverService} mainMapDriver
 */
function mousePositionDirective(mainMapDriver) {

    function linkMousePosition(scope, element, attrs, controller) {
        var control = new ol.control.MousePosition({
            target: element[0],
            coordinateFormat: coordinateFormat,
            undefinedHTML: '<b>Lon</b> | <b>Lat</b>'
        });

        scope.$watch(controller.getSelected, function(projection) {
            control.setProjection(ol.proj.get(projection));
        });

        mainMapDriver.addControl(control);

        element.on('$destroy', function() {
            mainMapDriver.removeControl(control);
        });

        function coordinateFormat(coordinate) {
            var digits = (control.getProjection().getUnits() === 'degrees') ? 5 : 0;

            var crs84 = ol.proj.get("CRS:84");
            var lonlat = ol.proj.transform(coordinate, control.getProjection(), crs84);
            var maxExtent = crs84.getExtent();

            var width = ol.extent.getWidth(maxExtent);
            var lon = (lonlat[0] - maxExtent[0])%width;
            if (lon < 0.0) {
                lon += width;
            }
            lon += maxExtent[0];
            var lat = Math.max(Math.min(lonlat[1], Math.max(maxExtent[1], maxExtent[3])), Math.min(maxExtent[1], maxExtent[3]));

            var _coord = ol.proj.transform([lon,lat], crs84, control.getProjection());

            return '<b>' + _coord[0].toFixed(digits) + '</b> | <b>' + _coord[1].toFixed(digits) + '</b>';
        }
    }

    return {
        restrict: 'E',
        scope: true,
        controller: MousePositionController,
        controllerAs: 'mpCtrl',
        link: linkMousePosition,
        templateUrl: 'components/footer/mouse-position/mouse-position.html'
    };
}

/**
 * @namespace airbus.components.footer.mousePosition
 * @requires ng
 * @requires airbus.shared.mainMap
 */
angular.module('airbus.components.footer.mousePosition', [
    'ng',
    'airbus.shared.mainMap'
]).directive('mousePosition', mousePositionDirective);