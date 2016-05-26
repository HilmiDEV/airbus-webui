/**
 * @ngdoc directive
 *
 * @param {MainMapDriverService} mainMapDriver
 */
function mapScaleDirective(mainMapDriver) {

    function linkMapScale(scope, element) {
        var control = new ol.control.ScaleLine({
            target: element[0],
            minWidth: 100
        });

        mainMapDriver.addControl(control);

        element.on('$destroy', function() {
            mainMapDriver.removeControl(control);
        });
    }

    return {
        restrict: 'E',
        link: linkMapScale
    };
}

/**
 * @namespace airbus.components.footer.mapScale
 * @requires ng
 * @requires airbus.shared.mainMap
 */
angular.module('airbus.components.footer.mapScale', [
    'ng',
    'airbus.shared.mainMap'
]).directive('mapScale', mapScaleDirective);