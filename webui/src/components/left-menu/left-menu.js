/**
 * @ngdoc controller
 *
 * @param {FullscreenService} fullScreen
 * @param {MainMapDriverService} mainMapDriver
 */
function LeftMenuController(fullscreen, mainMapDriver) {

    var self = this;


    self.fullScreenSupported = fullscreen.isSupported();

    self.isActiveFullScreen = fullscreen.isActive;

    self.fullScreen = fullscreen.toggle;

    self.zoomIn = mainMapDriver.zoomByDelta.bind(mainMapDriver, +1);

    self.zoomOut = mainMapDriver.zoomByDelta.bind(mainMapDriver, -1);

    self.zoomToExtent = mainMapDriver.zoomToExtent;
}

/**
 * @ngdoc directive
 */
function leftMenuDirective() {
    return {
        restrict: 'E',
        scope: true,
        controller: LeftMenuController,
        controllerAs: 'menuCtrl',
        templateUrl: 'components/left-menu/left-menu.html'
    };
}

/**
 * @namespace airbus.components.leftMenu
 * @requires ng
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.utils
 */
angular.module('airbus.components.leftMenu', [
    'ng',
    'airbus.shared.mainMap',
    'airbus.shared.utils'
]).directive('leftMenu', leftMenuDirective);