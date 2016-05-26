/**
 * @ngdoc controller
 *
 * @param {Object} notify
 * @param {Object} settingsService
 * @param {MainMapDriverService} mainMapDriver
 * @param {RightPanelDriverService} rightPanelDriver
 * @param {Utils} Utils
 */
function SettingsPanelController(notify, settingsService, mainMapDriver, rightPanelDriver, Utils) {

    var self = this;

    var settings = settingsService.getValue();


    self.basemap = settings.basemap;

    self.tileSize = self.basemap.source.tileSize || 256;

    self.basemapUrl = Utils.computeUrl(self.basemap.source.url, self.basemap.source.params);

    self.correction = settings.correction;

    self.wps = settings.wps;

    self.refreshOptions = [
        { label: '2s', value: 2000 },
        { label: '5s', value: 5000 },
        { label: '10s', value: 10000 },
        { label: '20s', value: 20000 }
    ];


    self.handleLayer = function(layer) {
        console.log('Received layer definition.');
    };

    self.save = function() {
        var parsed = Utils.parseParams(self.basemapUrl, true),
            params = angular.extend({ FORMAT: 'image/jpeg', TRANSPARENT: 'false' }, parsed.params);

        // Remove GetMap specific parameters.
        delete params.BBOX;
        delete params.CRS;
        delete params.HEIGHT;
        delete params.REQUEST;
        delete params.SRS;
        delete params.WIDTH;

        // Update basemap settings.
        settings.basemap.source = {
            type: 'TileWMS',
            url: parsed.url,
            tileSize: self.tileSize,
            params: params
        };

        // Store new settings.
        settingsService.setValue(settings);

        // Update main map.
        mainMapDriver.reloadBasemapLayer();
        mainMapDriver.zoomToExtent();

        // Notify user and close panel.
        notify.info('Settings updated', 3000);
        rightPanelDriver.close();
    };
}

/**
 * @ngdoc directive
 */
function settingsPanelDirective() {
    return {
        restrict: 'E',
        require: '^rightPanel',
        scope: true,
        controller: SettingsPanelController,
        controllerAs: 'settingsCtrl',
        templateUrl: 'components/right-panel/settings-panel/settings-panel.html'
    };
}

/**
 * @namespace airbus.components.rightPanel.settingsPanel
 * @requires ng
 * @requires notify
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.rightPanel
 * @requires airbus.shared.settings
 * @requires airbus.shared.utils
 */
angular.module('airbus.components.rightPanel.settingsPanel', [
    'ng',
    'notify',
    'airbus.shared.mainMap',
    'airbus.shared.rightPanel',
    'airbus.shared.settings',
    'airbus.shared.utils'
]).directive('settingsPanel', settingsPanelDirective);