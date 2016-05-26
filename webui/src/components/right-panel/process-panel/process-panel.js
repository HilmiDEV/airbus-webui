/**
 * @ngdoc controller
 *
 * @param {ProcessManagerService} processManager
 * @param {Object} notify
 */
function ProcessPanelController(processManager, notify) {

    var self = this;

    self.workflowName = 'wf1';

    self.processIdentifier = 'pf_workflow';

    self.exec = processManager.getExecution(self.workflowName);

    self.aoiExtent = self.exec ? self.exec.inputs.aoi : undefined;

    self.drawingAoi = false;


    self.execute = function() {
        var inputs = { workflow: self.workflowName, aoi: self.aoiExtent };

        var promise = processManager.execute(self.processIdentifier, inputs)
            .then(function onSuccess(process) {
                self.exec = process;
                processManager.getExecutionPromise(self.workflowName).catch(function() {
                    notify.error('Process "' + self.workflowName + '" has failed.', -1);
                });
                notify.info('Process "' + self.workflowName + '" started.', 5000);
            })
            .catch(function onFailure() {
                self.exec = undefined;
                notify.error('Unable to start the process "' + self.workflowName + '".', 5000);
            });

        notify.loading('Starting process "' + self.workflowName + '"...', promise);
    };

    self.pause = function() {
        processManager.pause(self.workflowName);
    };

    self.resume = function() {
        processManager.resume(self.workflowName);
    };

    self.abort = function() {
        processManager.abort(self.workflowName);
    };

    self.clear = function() {
        self.exec = self.aoiExtent = undefined;
        processManager.clearExecution(self.workflowName);
    };

    self.setWorkflow = function(workflowName, processIdentifier) {
        self.workflowName = workflowName;
        self.processIdentifier = processIdentifier;
        self.exec = processManager.getExecution(self.workflowName);
        self.aoiExtent = self.exec ? self.exec.inputs.aoi : undefined;
        self.drawingAoi = false;
    };

    self.estimateEnd = function(task) {
        if (!task || !task.completion || task.status !== 'running') {
            return undefined;
        }

        // Compute duration in milliseconds.
        var start = task.start_date,
            now = new Date().getTime(),
            duration = (now - start) * (100 / task.completion);

        // Compute end date.
        return start + duration;
    };

    self.mockPendingTasks = function() {
        // Clear previous task mocks.
        var pendingTasks = [];

        // Do nothing if the process is not started.
        if (!self.exec || self.exec.nb_activities === -1) {
            return pendingTasks;
        }

        // Compute new task mocks.
        var total = self.exec.nb_activities,
            start = (self.exec.activities || []).length + 1;
        for (var i = start; i <= total; i++) {
            pendingTasks.push('Task ' + i);
        }
        return pendingTasks;
    };


    self.$isDrawingAoi = function() {
        return self.drawingAoi;
    };

    self.$getAoiExtent = function() {
        return self.aoiExtent;
    };
}

/**
 * @ngdoc directive
 *
 * @param {MainMapDriverService} mainMapDriver
 */
function processPanelDirective(mainMapDriver) {

    function linkProcessPanel(scope, element, attrs, controllers) {
        var processCtrl = controllers[1];

        // Create interaction used to draw boxes on map.
        var interaction = new ol.interaction.DragBox({
            condition: processCtrl.$isDrawingAoi
        });
        mainMapDriver.addInteraction(interaction);

        // Create vector layer used to keep drawn boxes on map.
        var layer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: [255, 255, 255, 0.5], width: 4, lineCap: 'square', lineJoin: 'square' })
                }),
                new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: [30, 49, 116, 1], width: 2, lineCap: 'square', lineJoin: 'square' })
                })
            ]
        });
        mainMapDriver.getPrivateLayers().push(layer);

        // Listen interaction "boxend" event.
        interaction.on('boxend', handleBox);

        // Force map rotation to 0 deg. when drawing an AOI.
        scope.$watch(processCtrl.$isDrawingAoi, function(value) {
            if (value === true) {
                mainMapDriver.setRotation(0);
            }
        });

        // Draw AOI extent in vector layer.
        scope.$watch(processCtrl.$getAoiExtent, function(value) {
            layer.getSource().clear();
            if (angular.isArray(value)) {
                layer.getSource().addFeature(new ol.Feature({
                    geometry: ol.geom.Polygon.fromExtent(value)
                }));
            }
        }, true);

        // Remove interaction and layer when the panel is closed.
        element.on('$destroy', function() {
            interaction.un('boxend', handleBox);
            mainMapDriver.removeInteraction(interaction);
            mainMapDriver.getPrivateLayers().remove(layer);
        });


        function handleBox() {
            // Invalidate interaction condition and update model.
            scope.$apply(function() {
                processCtrl.drawingAoi = false;
                processCtrl.aoiExtent = interaction.getGeometry().clone().getExtent();
            });
        }
    }

    return {
        restrict: 'E',
        require: ['^rightPanel', 'processPanel'],
        scope: true,
        controller: ProcessPanelController,
        controllerAs: 'processCtrl',
        link: linkProcessPanel,
        templateUrl: 'components/right-panel/process-panel/process-panel.html'
    };
}

/**
 * @ngdoc filter
 */
function progressFilter($filter) {
    return function(task) {
        if (!task) {
            return 'Pending';
        }

        // Compute completion label.
        var percentLabel = $filter('number')(task.completion, 0) + '%';
        switch (task.status) {
            case 'done':
                return 'Success - ' + percentLabel;
            case 'failed':
                return 'Failure - ' + percentLabel;
            default:
                return percentLabel;
        }
    };
}

/**
 * @namespace airbus.components.rightPanel.processPanel
 * @requires ng
 * @requires notify
 * @requires airbus.shared.mainMap
 * @requires airbus.shared.process
 */
angular.module('airbus.components.rightPanel.processPanel', [
    'ng',
    'notify',
    'airbus.shared.mainMap',
    'airbus.shared.process'
]).directive('processPanel', processPanelDirective).filter('progress', progressFilter);