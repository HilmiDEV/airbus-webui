/**
 * @ngdoc controller
 *
 * @param {RightPanelDriverService} rightPanelDriver
 */
function RightMenuController(rightPanelDriver) {

    var self = this;


    self.openPanel = rightPanelDriver.open;
}

/**
 * @ngdoc directive
 */
function rightMenuDirective() {
    return {
        restrict: 'E',
        scope: true,
        controller: RightMenuController,
        controllerAs: 'menuCtrl',
        templateUrl: 'components/right-menu/right-menu.html'
    };
}

/**
 * @namespace airbus.components.rightMenu
 * @requires ng
 * @requires airbus.shared.rightPanel
 */
angular.module('airbus.components.rightMenu', [
    'ng',
    'airbus.shared.rightPanel'
]).directive('rightMenu', rightMenuDirective);