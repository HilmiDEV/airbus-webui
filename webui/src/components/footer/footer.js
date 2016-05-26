/**
 * @ngdoc directive
 */
function footerDirective() {
    return {
        restrict: 'E',
        templateUrl: 'components/footer/footer.html'
    };
}

/**
 * @namespace airbus.components.footer
 * @requires ng
 * @requires airbus.components.footer.mapOrientation
 * @requires airbus.components.footer.mousePosition
 * @requires airbus.components.footer.mapScale
 */
angular.module('airbus.components.footer', [
    'ng',
    'airbus.components.footer.mapOrientation',
    'airbus.components.footer.mapScale',
    'airbus.components.footer.mousePosition',
    'airbus.components.footer.mouseColor'
]).directive('footer', footerDirective);