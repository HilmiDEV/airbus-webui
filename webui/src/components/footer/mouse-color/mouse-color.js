/**
 * @ngdoc controller
 * @name MouseColorController
 *
 * @this MouseColorController
 */
function MouseColorController() {
    var self = this;

    self.hover = false;
    self.pixel = [0,0];
    self.color = [0,0,0,0];
}

/**
 * @ngdoc directive
 *
 * @param {olMapService} olMap
 */
function mouseColorDirective(olMap) {

    function linkMouseColor(scope, element, attrs, controller) {

        function onPointerMoveHandler(event) {
            var map = event.map;
            controller.pixel = event.pixel;
            var viewport = map.getViewport();
            var canvas = angular.element(viewport).find("canvas");
            if (canvas.length > 0) {
                canvas = canvas[0];
                var context = canvas.getContext("2d");
                var imageData = context.getImageData(controller.pixel[0],controller.pixel[1],1,1);
                controller.hover = true;
                controller.color = imageData.data;
            } else {
                controller.hover = false;
                controller.color = [0,0,0,0];
            }
            scope.$digest();
        }

        function onMouseOutHandler(event) {
            controller.hover = false;
            scope.$digest();
        }

        olMap.get('main').then(function(map) {
            map.on('pointermove', onPointerMoveHandler);
            angular.element(map.getViewport()).on("mouseleave", onMouseOutHandler);
        });

        element.on('$destroy', function() {
            olMap.get('main').then(function(map) {
                map.un('pointermove', onPointerMoveHandler);
                angular.element(map.getViewport()).off("mouseleave", onMouseOutHandler);
            });
        });
    }

    return {
        restrict: 'E',
        scope: {},
        link: linkMouseColor,
        controller: MouseColorController,
        controllerAs: "mcCtrl",
        templateUrl: 'components/footer/mouse-color/mouse-color.html'
    };
}

/**
 * @namespace airbus.components.footer.mouseColor
 * @requires ng
 * @requires airbus.shared.mainMap
 */
angular.module('airbus.components.footer.mouseColor', [
    'ng',
    'ol'
]).directive('mouseColor', mouseColorDirective);