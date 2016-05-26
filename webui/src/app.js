/**
 * Set projection definitions :
 *
 * Proj4:
 *  - CRS:84 (http://spatialreference.org/ref/epsg/4326/proj4/)
 *  - EPSG:4326 (http://spatialreference.org/ref/epsg/4326/proj4/ with "neu" axis)
 *  - EPSG:32719 (http://spatialreference.org/ref/epsg/32719/proj4/)
 *  - EPSG:32720 (http://spatialreference.org/ref/epsg/32720/proj4/)
 *
 * OpenLayers:
 *  - OGC:CRS84 (alias of CRS:84)
 */
proj4.defs("CRS:84", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +ellps=WGS84 +datum=WGS84 +axis=neu +no_defs");
proj4.defs('EPSG:32719', '+proj=utm +zone=19 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32720', '+proj=utm +zone=20 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
olProjectionAlias('OGC:CRS84', ol.proj.get('CRS:84'));

/**
 * @ngdoc application
 * @namespace airbus
 *
 * Define Angular application module.
 */
angular.module('airbus', [
    // Libraries.
    'notify',
    'ol',
    'rzModule',
    // Application.
    'airbus.components.footer',
    'airbus.components.leftMenu',
    'airbus.components.mainMap',
    'airbus.components.rightMenu',
    'airbus.components.annotationsMenu',
    'airbus.components.rightPanel',
    'airbus.shared.settings',
    'airbus.templates']);

/**
 * Start application module only when settings are resolved (asynchronous).
 */
$.getJSON('settings.json', function(settings) {

    /**
     * @param {SettingsServiceProvider} settingsServiceProvider
     * @param {OlMapProvider} olMapProvider
     * @param {NotifyProvider} notifyProvider
     */
    function configFunction(settingsServiceProvider, olMapProvider, notifyProvider) {

        // Setup default settings value.
        settingsServiceProvider.defaultValue(settings);

        // Setup map options (called when the "ol-map" directive with the specified name is rendered).
        olMapProvider.provideOptions('main', 'mainMapOptions');

        // Configure notification levels for shortcut methods.
        notifyProvider.config.levels = ['info', 'warn', 'error', 'loading'];
    }

    // Configure application module.
    angular.module('airbus').config(configFunction);

    // Start angular application module.
    angular.bootstrap(window.document, ['airbus']);
});

/**
 * Register a new ol.proj.Projection as alias of another projection.
 *
 * @param {String} alias The alias projection code.
 * @param {ol.proj.Projection} projection The equivalent projection.
 */
function olProjectionAlias(alias, projection) {
    var copy = new ol.proj.Projection({
        code: alias,
        units: projection.getUnits(),
        extent: projection.getExtent(),
        axisOrientation: projection.getAxisOrientation(),
        global: projection.isGlobal(),
        metersPerUnit: projection.getMetersPerUnit(),
        worldExtent: projection.getWorldExtent(),
        getPointResolution: projection.getPointResolution
    });
    ol.proj.addEquivalentProjections([projection, copy]);
}

