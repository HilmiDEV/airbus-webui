/**
 * @ngdoc controller
 *
 */
function AnnotationsMenuController() {

    var self = this;

}

/**
 * @ngdoc directive
 */
function annotationsMenuDirective() {
    return {
        restrict: 'E',
        scope: true,
        controller: AnnotationsMenuController,
        controllerAs: 'annotCtrl',
        templateUrl: 'components/annotations-menu/annotations-menu.html'
    };
}

/**
 * @namespace airbus.components.annotationsMenu
 * @requires ng
 * @requires airbus.shared.utils
 */
angular.module('airbus.components.annotationsMenu', [
    'ng',
    'airbus.shared.utils'
]).directive('annotationsMenu', annotationsMenuDirective);