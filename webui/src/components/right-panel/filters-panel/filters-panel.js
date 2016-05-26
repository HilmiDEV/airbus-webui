/**
 * @ngdoc controller
 *
 * @param {Object} notify
 * @param {FiltersServiceService} filtersService
 * @param {RightPanelDriverService} rightPanelDriver
 */
function FiltersPanelController(notify, filtersService, rightPanelDriver) {

    var self = this;


    self.value = filtersService.getValue();

    self.apply = function() {
        // Store new filters.
        filtersService.setValue(self.value);

        // Notify user and close panel.
        notify.info('Filters updated', 3000);
        rightPanelDriver.close();
    };
}

/**
 * @ngdoc directive
 */
function filtersPanelDirective() {
    return {
        restrict: 'E',
        require: '^rightPanel',
        scope: true,
        controller: FiltersPanelController,
        controllerAs: 'filtersCtrl',
        templateUrl: 'components/right-panel/filters-panel/filters-panel.html'
    };
}

/**
 * @namespace airbus.components.rightPanel.filtersPanel
 * @requires ng
 * @requires airbus.shared.filters
 * @requires airbus.shared.rightPanel
 */
angular.module('airbus.components.rightPanel.filtersPanel', [
    'ng',
    'notify',
    'airbus.shared.filters',
    'airbus.shared.rightPanel'
]).directive('filtersPanel', filtersPanelDirective);