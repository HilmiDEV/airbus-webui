/**
 * @ngdoc service
 *
 * @param {$rootScope} $rootScope - {https://docs.angularjs.org/api/ng/service/$rootScope}
 * @param {$q} $q - {https://docs.angularjs.org/api/ng/service/$q}
 * @param {$window} $rootScope - {https://docs.angularjs.org/api/ng/service/$window}
 * @param {$window} $window - {https://docs.angularjs.org/api/ng/service/$window}
 * @param {$interval} $interval - {https://docs.angularjs.org/api/ng/service/$interval}
 * @param {Function} localStorage
 * @param {Object} settingsService
 * @param {ProcessClientService} processClient
 * @param {MainMapDriverService} mainMapDriver
 */
function ProcessManagerService($rootScope, $q, $window, $interval, localStorage, settingsService, processClient, mainMapDriver) {

    var self = this;

    var contextStorage = localStorage('processes');

    var wpsSettings;

    var statusDaemon;

    /**
     *  {
     *      workflowName: {
     *          activityId: {
     *              data: { ... },
     *              layer: ol.layer.Vector
     *          },
     *          0...n
     *      },
     *      0...n
     *  }
     */
    var activityIndex = {};

    var executionDeferred = {};

    var executionMap = angular.extend({}, contextStorage.read());


    self.setup = setup;

    self.getExecution = getExecution;

    self.getExecutionPromise = getExecutionPromise;

    self.clearExecution = clearExecution;

    self.execute = executeProcess;

    self.pause = action.bind(self, 'pause');

    self.resume = action.bind(self, 'resume');

    self.abort = action.bind(self, 'abort');


    $rootScope.$on('settingsChanged', setup);

    $window.addEventListener('beforeunload', function serializeContext() {
        contextStorage.write(executionMap);
    });


    // API
    // ----------

    function setup() {
        // Acquire (new) settings value.
        wpsSettings = settingsService.getValue().wps;

        // Cancel previous daemon (if any).
        $interval.cancel(statusDaemon);

        // Setup (new) daemon.
        statusDaemon = $interval(requestProcessStatus, wpsSettings.refresh, 0, false);
    }

    function getExecution(workflowName) {
        return executionMap[workflowName];
    }

    function getExecutionPromise(workflowName) {
        if (!executionDeferred[workflowName]) {
            executionDeferred[workflowName] = $q.defer();
        }
        return executionDeferred[workflowName].promise;
    }

    function clearExecution(workflowName) {
        // Remove activity layers.
        angular.forEach(activityIndex[workflowName], function(activity) {
            if (activity.layer) {
                mainMapDriver.getPrivateLayers().remove(activity.layer);
            }
        });

        // Clear execution data.
        delete executionDeferred[workflowName];
        delete activityIndex[workflowName];
        delete executionMap[workflowName];
    }

    // Execute
    // ----------

    function executeProcess(processIdentifier, inputs) {
        // Define workspace form settings.
        inputs.workspace = wpsSettings.workspace;

        // Start workflow.
        return processClient.execute(wpsSettings.url, processIdentifier, inputs)
            .then(handleProcessExecution.bind(self, inputs));
    }

    function handleProcessExecution(inputs, response) {
        // Create and store execution description.
        executionMap[inputs.workflow] = {
            activities: [],
            completion: 0,
            id: undefined,
            inputs: inputs,
            nb_activities: -1,
            start_date: new Date(),
            statusLocation: response.statusLocation,
            status: 'running'
        };

        // Return execution description.
        return executionMap[inputs.workflow];
    }

    // Actions
    // ----------

    function action(actionName, workflowName) {
        return processClient.action(wpsSettings.url, { workflowId: executionMap[workflowName].id, action: actionName });
    }

    // Status
    // ----------

    function requestProcessStatus() {
        angular.forEach(executionMap, function(execution) {
            // Ensure that the workflow is started.
            if (execution.status === 'running') {
                processClient.getStatus(execution.statusLocation)
                    .then(handleProcessStatus.bind(self, execution))
                    .catch(handleProcessFailed.bind(self, execution));
            }
        });
    }

    function handleProcessStatus(execution, response) {
        var statusOutput = response.outputs.wfStatus,
            extentsOutput = response.outputs.extents,
            wmsNameOutput = response.outputs.wmsName,
            wmsLayerUpdateOutput = response.outputs.wmsLayerUpdate;

        // Workflow status may be not available yet.
        if (!statusOutput) {
            return;
        }

        // Generate activity map from outputs.
        var outputActivities = {};
        angular.forEach(statusOutput.activities, function(activity) {
            outputActivities[activity.id] = activity;
        });
        angular.forEach(extentsOutput, function(extent) {
            outputActivities[extent.activity_id].jobs = extent.jobs;
        });

        // Try to get known/previous activity map from internal index.
        var knownActivities = activityIndex[execution.inputs.workflow];
        if (!knownActivities) {
            knownActivities = activityIndex[execution.inputs.workflow] = {};
        }

        // For each output activity.
        angular.forEach(outputActivities, function(activity, id) {
            knownActivities[id] = knownActivities[id] || {};

            var isNew = !knownActivities[id].data,
                isRunning = (activity.status === 'running'),
                actLayer = knownActivities[id].layer;

            // Create or destroy activity layer.
            if (isRunning && (isNew || !actLayer)) {
                actLayer = knownActivities[id].layer = createActivityLayer();
                mainMapDriver.getPrivateLayers().push(actLayer);
            } else if (!isRunning && actLayer) {
                mainMapDriver.getPrivateLayers().remove(actLayer);
                actLayer = knownActivities[id].layer = undefined;
            }

            // Update activity layer features.
            if (isRunning && activity.jobs) {
                updateActivityLayer(actLayer, activity.jobs);
            }

            // Update known/previous activity internal index.
            delete activity.jobs;
            if (activity.nb_jobs > 0) {
                activity.completion = (activity.nb_jobs_done * 100) / activity.nb_jobs;
            } else {
                activity.completion = 0;
            }
            activity.start_date = new Date(activity.start_date).getTime();
            knownActivities[id].data = activity;
        });

        // If the WMS layer is "ready" (the "wms_layer_update" is defined).
        if (angular.isNumber(wmsLayerUpdateOutput)) {
            var wfLayer = mainMapDriver.getPublicLayerById(statusOutput.id);

            // Create or update workflow WMS layer.
            if (wmsLayerUpdateOutput > execution.wms_layer_update) {
                updateWorkflowLayer(wfLayer);
            } else {
                addWorkflowLayer(wmsNameOutput, statusOutput.id);
            }
        }

        // Update execution description from status response.
        execution.activities = statusOutput.activities;
        execution.completion = response.percentCompleted || execution.completion;
        execution.id = statusOutput.id;
        execution.nb_activities = statusOutput.nb_activities;
        execution.start_date = new Date(statusOutput.start_date).getTime();
        execution.status = statusOutput.status;
        execution.wms_layer_update = wmsLayerUpdateOutput;

        // Resolve deferred promise.
        if (executionDeferred[execution.inputs.workflow]) {
            switch (execution.status) {
                case 'done':
                    executionDeferred[execution.inputs.workflow].resolve(execution);
                    break;
                case 'aborted':
                    executionDeferred[execution.inputs.workflow].reject(execution);
                    break;
            }
        }
    }

    function handleProcessFailed(execution, cause) {
        execution.status = 'failed';

        // Reject deferred promise.
        if (executionDeferred[execution.inputs.workflow]) {
            executionDeferred[execution.inputs.workflow].reject(cause);
        }
    }

    // Layers
    // ----------

    function addWorkflowLayer(wmsName, layerName) {
        // Compute WS root URL from configured WPS URL.
        var wsRootUrl = wpsSettings.url.substring(0, wpsSettings.url.indexOf('/WS/wps/') + 3);

        // Create WMS layer and display it.
        mainMapDriver.addPublicWMSLayer(wsRootUrl + '/wms/' + wmsName, {
            LAYERS: layerName,
            VERSION: '1.3.0'
        });
    }

    function updateWorkflowLayer(layer) {
        // Force layer update adding the current timestamp in parameters.
        layer.get('original_source').updateParams({
            _: new Date().getTime()
        });
    }

    function createActivityLayer() {
        return new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: styleJobFeature,
            useSpatialIndex: false
        });
    }

    function updateActivityLayer(layer, jobs) {
        var source = layer.getSource(), newFeatures = [];

        for (var i = 0, len = jobs.length; i < len; i++) {
            var job = jobs[i], feature = source.getFeatureById(job.id);

            if (feature && feature.get('percent') !== job.percent) {
                feature.set('percent', job.percent);
            } else {
                feature = createActivityJobFeature(job.percent, job.extent);
                feature.setId(job.id);
                newFeatures.push(feature);
            }
        }

        source.addFeatures(newFeatures);
    }

    // Features
    // ----------

    function createActivityJobFeature(percent, coordinates) {
        return new ol.Feature({
            percent: percent,
            geometry: new ol.geom.Polygon([coordinates])
        });
    }

    function styleJobFeature(feature) {
        var percent = feature.get('percent'),
            strokeColor, fillColor;

        // Set colors according the job completion percent.
        if (percent === 100) {
            strokeColor = [12, 201, 126, 1];
            fillColor = [12, 201, 126, 0.3];
        } else if (percent === -1) {
            strokeColor = [229, 13, 13, 1];
            fillColor = [229, 13, 13, 0.3];
        } else {
            strokeColor = [49, 159, 211, 1];
            fillColor = [49, 159, 211, 0.3];
        }

        // Create ol.style.Style instance.
        var style = new ol.style.Style({
            fill: new ol.style.Fill({ color: fillColor }),
            stroke: new ol.style.Stroke({ color: strokeColor, width: 1 })
        });
        return [style];
    }
}

/**
 * @ngdoc service
 *
 * @param {$q} $q
 * @param {$log} $log - {https://docs.angularjs.org/api/ng/service/$log}
 * @param {$http} $http
 */
function ProcessClientService($q, $log, $http) {

    var self = this;

    var parser = new DOMParser();

    var httpConfig = {
        headers: {
            'Accept': 'text/xml, text/plain, */*',
            'Content-Type': 'text/xml'
        },
        proxify: false,
        responseType: 'text'
    };

    var executeXmlTemplate =
        '<wps:Execute xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ows="http://www.opengis.net/ows/1.1" service="WPS" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">' +
            '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}</ows:Identifier>' +
            '<wps:DataInputs>' +
                '<wps:Input>' +
                    '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:input:input_workspace</ows:Identifier>' +
                    '<wps:Data><wps:LiteralData>{workspace}</wps:LiteralData></wps:Data>' +
                '</wps:Input>' +
                '<wps:Input>' +
                    '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:input:input_wf_name</ows:Identifier>' +
                    '<wps:Data><wps:LiteralData>{workflow}</wps:LiteralData></wps:Data>' +
                '</wps:Input>' +
                '<wps:Input>' +
                    '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:input:input_aoi</ows:Identifier>' +
                    '<wps:Data><wps:LiteralData>{aoi}</wps:LiteralData></wps:Data>' +
                '</wps:Input>' +
            '</wps:DataInputs>' +
            '<wps:ResponseForm>' +
                '<wps:ResponseDocument storeExecuteResponse="true" status="true">' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:output:output_wf_id</ows:Identifier>' +
                    '</wps:Output>' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:output:output_wf_status</ows:Identifier>' +
                    '</wps:Output>' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:output:output_extents</ows:Identifier>' +
                    '</wps:Output>' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:output:output_wms_name</ows:Identifier>' +
                    '</wps:Output>' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:{processIdentifier}:output:output_wms_layer_update</ows:Identifier>' +
                    '</wps:Output>' +
                '</wps:ResponseDocument>' +
            '</wps:ResponseForm>' +
        '</wps:Execute>';

    var actionXmlTemplate =
    	'<wps:Execute xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ows="http://www.opengis.net/ows/1.1" service="WPS" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">' +
            '<ows:Identifier>urn:ogc:cstl:wps:pf:pf_control_actions</ows:Identifier>' +
            '<wps:DataInputs>' +
                '<wps:Input>' +
                    '<ows:Identifier>urn:ogc:cstl:wps:pf:pf_control_actions:input:process_id</ows:Identifier>' +
                    '<wps:Data><wps:LiteralData>{workflowId}</wps:LiteralData></wps:Data>' +
                '</wps:Input>' +
                '<wps:Input>' +
                    '<ows:Identifier>urn:ogc:cstl:wps:pf:pf_control_actions:input:action</ows:Identifier>' +
                    '<wps:Data><wps:LiteralData>{action}</wps:LiteralData></wps:Data>' +
                '</wps:Input>' +
            '</wps:DataInputs>' +
            '<wps:ResponseForm>' +
                '<wps:ResponseDocument storeExecuteResponse="false" status="false">' +
                    '<wps:Output asReference="false">' +
                        '<ows:Identifier>urn:ogc:cstl:wps:pf:pf_control_actions:output:result</ows:Identifier>' +
                    '</wps:Output>' +
                '</wps:ResponseDocument>' +
            '</wps:ResponseForm>' +
        '</wps:Execute>';


    self.execute = function(serviceUrl, processIdentifier, processInputs) {
        var executeXml = executeXmlTemplate
            .replace(/{processIdentifier}/g, processIdentifier)
            .replace(/{workspace}/g, processInputs.workspace)
            .replace(/{workflow}/g, processInputs.workflow)
            .replace(/{aoi}/g, processInputs.aoi.toString());

        return $http.post(serviceUrl, executeXml, httpConfig).then(handleExecuteResponse);
    };

    self.getStatus = function(statusLocation) {
        return $http.get(statusLocation, httpConfig).then(handleStatusResponse);
    };

    self.action = function(serviceUrl, processInputs) {
        var executeXml = actionXmlTemplate
            .replace(/{workflowId}/g, processInputs.workflowId)
            .replace(/{action}/g, processInputs.action);

        return $http.post(serviceUrl, executeXml, httpConfig);
    };


    function handleExecuteResponse(executeResponse) {
        var responseDoc = parser.parseFromString(executeResponse.data, 'text/xml'),
            rootElement = responseDoc.documentElement;

        return {
            statusLocation: rootElement.getAttribute('statusLocation')
        };
    }

    function handleStatusResponse(statusResponse) {
        var deferred = $q.defer(),
            responseDoc = parser.parseFromString(statusResponse.data, 'text/xml');

        // Extract process completion percent.
        var statusElement = responseDoc.getElementsByTagNameNS('*', 'Status')[0],
            completionElement = statusElement.children[0],
            percentCompleted;
        if (completionElement.tagName.indexOf('ProcessStarted') !== -1) {
            percentCompleted = parseInt(completionElement.getAttribute('percentCompleted'), 10);
        } else if (completionElement.tagName.indexOf('ProcessFailed') !== -1) {
            var causeElement = responseDoc.getElementsByTagNameNS('*', 'ExceptionText')[0];
            deferred.reject(causeElement ? causeElement.innerHTML : undefined);
        }

        // Extract and parse outputs.
        var outputElements = responseDoc.getElementsByTagNameNS('*', 'Output'),
            outputs = {};
        angular.forEach(outputElements, function(element) {
            var identifier = element.getElementsByTagNameNS('*', 'Identifier')[0].innerHTML,
                outputData = element.getElementsByTagNameNS('*', 'LiteralData')[0].innerHTML;
            if (!outputData) {
                return;
            }
            if (identifier.indexOf('output_wf_status') !== -1) {
                outputs.wfStatus = parseJsonSafe(outputData);
            } else if (identifier.indexOf('output_extents') !== -1) {
                outputs.extents = parseJsonSafe(outputData);
            } else if (identifier.indexOf('output_wms_name') !== -1) {
                outputs.wmsName = outputData;
            } else if (identifier.indexOf('output_wms_layer_update') !== -1) {
                outputs.wmsLayerUpdate = parseInt(outputData, 10);
            }
        });

        // Return parsed response.
        deferred.resolve({
            percentCompleted: percentCompleted,
            outputs: outputs
        });
        return deferred.promise;
    }

    function parseJsonSafe(json) {
        try {
            return angular.fromJson(json);
        } catch(error) {
            $log.warn(error);
        }
        return undefined;
    }
}

/**
 * @param {ProcessManagerService} processManager
 */
function runProcessModule(processManager) {

    // Start process status daemon.
    processManager.setup();
}


/**
 * @namespace airbus.shared.process
 * @requires ng
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.settings
 * @requires airbus.shared.utils
 */
angular.module('airbus.shared.process', ['ng', 'airbus.shared.mainMap', 'airbus.shared.settings', 'airbus.shared.utils'])
    .service('processManager', ProcessManagerService)
    .service('processClient', ProcessClientService)
    .run(runProcessModule);