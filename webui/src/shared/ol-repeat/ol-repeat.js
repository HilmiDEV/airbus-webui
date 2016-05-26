/**
 * @ngdoc directive
 */
function olRepeatDirective($compile) {

    var ngRepeatExpFormat = '{alias} in ({collection}.getArray() | reverse:{reverse})';

    function linkOlRepeat(scope, element) {
        // Directive is "terminal" and needs to be compiled manually.
        $compile(element)(scope);
    }

    function compileOlRepeat(element, attrs) {
        // Parse olRepeat directive expression.
        var match = attrs.olRepeat.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/),
            aliasExp = match[1],
            collectionExp = match[2],
            reverseExp = attrs.olRepeatReverse;

        // Compute ngRepeat directive expression.
        var ngRepeatExp = ngRepeatExpFormat
            .replace(/{alias}/g, aliasExp)
            .replace(/{collection}/g, collectionExp)
            .replace(/{reverse}/g, reverseExp);

        // Transform olRepeat directive into ngRepeat directive.
        element.attr('ng-repeat', ngRepeatExp)
            .attr('ol-repeat-hook', attrs.olRepeat)
            .removeAttr('ol-repeat')
            .removeAttr('ol-repeat-reverse');

        // Return link function.
        return linkOlRepeat;
    }

    return {
        restrict: 'A',
        priority: 1000,
        terminal: true,
        compile: compileOlRepeat
    };
}

/**
 * @ngdoc directive
 */
function olRepeatHookDirective() {

    function linkOlRepeatHook(scope, element, attrs) {
        var match = attrs.olRepeatHook.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/),
            aliasExp = match[1],
            collectionExp = match[2],
            olObject,
            olCollection,
            propertyWatchers = [];

        scope.$watch(aliasExp, function onItemChanged(newObject) {
            if (!(newObject instanceof ol.Object)) {
                // Do nothing, the ol.Object instance has already been handled.
                return;
            }

            // Store new ol.Object and ol.Collection instances.
            olObject = newObject;
            olCollection = scope.$eval(collectionExp);

            // De-register old property listeners.
            unwatchProperties();

            // Replace ol.Object instance with an observable model.
            var model = scope[aliasExp] = {};
            angular.forEach(olObject.getProperties(), function(value, key) {
                // It's dangerous to store ol.Object in scopes because many of them have
                // a reference to their parent or container. An infinite loop may occur
                // when angular checks objects deep equality during the $digest phase.
                if (!(value instanceof ol.Object)) {
                    // Copy property in model.
                    model[key] = angular.copy(value);
                    // Watch property changes.
                    watchProperty(aliasExp, key);
                }
            });
        });

        scope.$getItem = function() {
            return olObject;
        };

        scope.$getCollection = function() {
            return olCollection;
        };

        scope.$move = function(delta) {
            var index = olCollection.getArray().indexOf(olObject);
            olCollection.removeAt(index);
            olCollection.insertAt(index + delta, olObject);
        };

        scope.$remove = function() {
            olCollection.remove(olObject);
        };


        function watchProperty(modelAlias, propertyName) {
            var watcher = scope.$watch(modelAlias + '.' + propertyName, function(newValue, oldValue) {
                if (newValue !== oldValue) {
                    olObject.set(propertyName, newValue);
                }
            }, true);
            propertyWatchers.push(watcher);
        }

        function unwatchProperties() {
            angular.forEach(propertyWatchers, function(removeWatcher) {
                removeWatcher();
            });
            propertyWatchers = [];
        }
    }

    return {
        restrict: 'A',
        priority: 999,
        link: linkOlRepeatHook
    };
}

/**
 * @namespace airbus.shared.olRepeat
 * @requires ng
 * @requires airbus.shared.utils
 */
angular.module('airbus.shared.olRepeat', ['ng', 'airbus.shared.utils'])
    .directive('olRepeat', olRepeatDirective)
    .directive('olRepeatHook', olRepeatHookDirective);