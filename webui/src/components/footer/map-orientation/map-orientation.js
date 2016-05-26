/**
 * @ngdoc directive
 *
 * @param {MainMapDriverService} mainMapDriver
 */
function mapOrientationDirective(mainMapDriver) {

    function linkMapOrientation(scope, element) {
        var control = new ol.control.Rotate({
            target: element[0],
            autoHide: false,
            label: angular.element('<img src="img/north.png"/>')[0]
        });

        mainMapDriver.addControl(control);

        element.on('$destroy', function() {
            mainMapDriver.removeControl(control);
        });
    }

    return {
        restrict: 'E',
        link: linkMapOrientation
    };
}

/**
 * @namespace airbus.components.footer.mapOrientation
 * @requires ng
 * @requires airbus.shared.mainMap
 */
angular.module('airbus.components.footer.mapOrientation', [
    'ng',
    'airbus.shared.mainMap'
]).directive('mapOrientation', mapOrientationDirective);