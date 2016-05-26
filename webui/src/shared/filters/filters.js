/**
 * @ngdoc service
 *
 * @param {Function} localStorage
 * @param {MainMapDriverService} mainMapDriver
 */
function FiltersServiceService(localStorage, mainMapDriver) {

    var self = this;

    var storage = localStorage('filters');

    var filters = storage.read() || {
        spot67: false,
        deimos: false,
        pleiades: false,
        terrasar: false,
        sortBy: null,
        date: null,
        eachYear: false
    };


    self.setup = angular.noop;

    self.getValue = getValue;

    self.setValue = setValue;


    mainMapDriver.getPublicLayers().on('add', onLayerAdded);


    function getValue() {
        // Return a copy to force the using of the "setValue" method to apply modifications.
        return angular.copy(filters);
    }

    function setValue(value) {
        filters = value;

        // Write the new filters in local storage.
        storage.write(filters);

        // Apply filters on layers.
        mainMapDriver.getPublicLayers().forEach(applyFilters);
    }

    function applyFilters(layer) {
        var source = layer.get('original_source');
        if (source instanceof ol.source.WMTS) {
            var dimensions = source.getDimensions();

            // Sensors.
            var enabledSensors = [];
            if (filters.spot67) {
                enabledSensors.push('spot6');
            }
            if (filters.deimos) {
                enabledSensors.push('deimos');
            }
            if (filters.pleiades) {
                enabledSensors.push('pleiades');
            }
            if (filters.terrasar) {
                enabledSensors.push('TerraSAR');
            }
            if (enabledSensors.length) {
                dimensions.SENSOR = enabledSensors.join(',');
            } else {
                delete dimensions.SENSOR;
            }

            // Sort by cloud.
            dimensions.BYCLOUD = (filters.sortBy === 'cloud');

            // Date.
            if (filters.date) {
                if (filters.sortBy === 'age_asc') {
                    dimensions.TIME = filters.date + '/' + moment().format('YYYY-MM-DD');
                } else if (filters.sortBy === 'age_desc') {
                    dimensions.TIME = '1970-01-01/' + filters.date;
                } else {
                    dimensions.TIME = filters.date;
                }
                if (filters.eachYear) {
                    dimensions.TIME = dimensions.TIME + '/P1Y';
                }
            } else {
                delete dimensions.TIME;
            }

            // Update dimensions.
            source.updateDimensions(dimensions);
        }
    }

    function onLayerAdded(event) {
        applyFilters(event.element);
    }
}

/**
 * @param {FiltersServiceService} filtersService
 */
function runFiltersModule(filtersService) {

    // Does nothing.
    filtersService.setup();
}

/**
 * @namespace airbus.shared.rightPanel
 * @requires ng
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.utils
 */
angular.module('airbus.shared.filters', ['ng', 'airbus.shared.mainMap', 'airbus.shared.utils'])
    .service('filtersService', FiltersServiceService)
    .run(runFiltersModule);