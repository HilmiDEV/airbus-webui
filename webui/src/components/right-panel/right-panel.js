/**
 * @ngdoc controller
 *
 * @param {RightPanelDriverService} rightPanelDriver
 */
function RightPanelController(rightPanelDriver) {

    var self = this;


    self.open = rightPanelDriver.open;

    self.close = rightPanelDriver.close;

    self.isOpen = rightPanelDriver.isOpen;

    self.isPaused = rightPanelDriver.isPaused;
}

/**
 * @ngdoc directive
 *
 * @param {$animate} $animate
 * @param {RightPanelDriverService} rightPanelDriver
 */
function rightPanelDirective($animate, $document, rightPanelDriver) {

    function linkRightPanel(scope, element) {
        var bodyElement = angular.element($document[0].body);

        scope.$watch(rightPanelDriver.isEmpty, function(value) {
            $animate[value ? 'removeClass' : 'addClass'](element, 'show', {
                tempClasses: 'show-animate'
            });
            bodyElement[value ? 'removeClass' : 'addClass']('right-panel-open');
        });
    }

    return {
        restrict: 'E',
        scope: true,
        controller: RightPanelController,
        controllerAs: 'panelCtrl',
        link: linkRightPanel,
        templateUrl: 'components/right-panel/right-panel.html'
    };
}

/**
 * @namespace airbus.components.rightPanel
 * @requires ng
 * @requires airbus.shared.rightPanel
 * @requires airbus.components.rightPanel.filtersPanel
 * @requires airbus.components.rightPanel.layersPanel
 * @requires airbus.components.rightPanel.processPanel
 * @requires airbus.components.rightPanel.settingsPanel
 * @requires airbus.components.rightPanel.sourcePanel
 */
angular.module('airbus.components.rightPanel', [
    'ng',
    'airbus.shared.rightPanel',
    'airbus.components.rightPanel.filtersPanel',
    'airbus.components.rightPanel.layersPanel',
    'airbus.components.rightPanel.processPanel',
    'airbus.components.rightPanel.settingsPanel',
    'airbus.components.rightPanel.sourcePanel'
]).directive('rightPanel', rightPanelDirective);