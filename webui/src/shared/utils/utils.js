/**
 * @ngdoc service
 *
 * @param {$document} $document - {@link https://docs.angularjs.org/api/ng/service/$document}
 */
function FullscreenService($document) {

    var self = this;
    
    var document = $document[0];

    var body = document.body;


    self.isSupported = function() {
        return !!(body.webkitRequestFullscreen ||
            (body.mozRequestFullScreen && document.mozFullScreenEnabled) ||
            (body.msRequestFullscreen && document.msFullscreenEnabled) ||
            (body.requestFullscreen && document.fullscreenEnabled));
    };

    self.isActive = function() {
        return !!(angular.element(body).hasClass('fullscreen') ||
            document.webkitIsFullScreen || document.mozFullScreen ||
            document.msFullscreenElement || document.fullscreenElement);
    };

    self.enter = function(targetElement) {
        if (targetElement.webkitRequestFullscreen) {
            targetElement.webkitRequestFullscreen();
        } else if (targetElement.mozRequestFullScreen) {
            targetElement.mozRequestFullScreen();
        } else if (targetElement.msRequestFullscreen) {
            targetElement.msRequestFullscreen();
        } else if (targetElement.requestFullscreen) {
            targetElement.requestFullscreen();
        }
        angular.element(body).addClass('fullscreen');
    };

    self.exit = function() {
        if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        angular.element(body).removeClass('fullscreen');
    };

    self.toggle = function(targetElement) {
        if (self.isActive()) {
            self.exit();
        } else {
            self.enter(targetElement || body);
        }
    };
}

/**
 * @ngdoc factory
 *
 * @param {$window} $window - {@link https://docs.angularjs.org/api/ng/service/$window}
 */
function localStorageFactory($window) {
    return function(key) {
        return {
            read: function() {
                return angular.fromJson($window.localStorage.getItem(key));
            },

            write: function(value) {
                $window.localStorage.setItem(key, angular.toJson(value));
            },

            clear: function() {
                $window.localStorage.removeItem(key);
            }
        };
    };
}

/**
 * @ngdoc autofocus
 *
 * @param {$timeout} $timeout   -   {@link https://docs.angularjs.org/api/ng/service/$timeout}
 */
function autofocusDirective($timeout) {

    function linkAutofocus(scope, element) {
        $timeout(function() {
            element[0].focus();
        });
    }

    return {
        restrict: 'A',
        link: linkAutofocus
    };
}

/**
 * @ngdoc directive
 * @name datepicker
 */
function datepicker() {

    function linkDatepicker(scope, element, attrs) {
        scope.$watch(attrs.datepicker, function(newVal) {
            element.datepicker('remove');
            element.datepicker(angular.extend({ autoclose: true }, newVal));
        }, true);
    }

    return {
        restrict: 'A',
        link: linkDatepicker
    };
}

/**
 * @ngdoc directive
 * @name contextmenu
 *
 * https://github.com/Templarian/ui.bootstrap.contextMenu
 */
function contextmenu() {

    var renderContextMenu = function ($scope, event, options, model) {
        $(event.currentTarget).addClass('context');
        var $contextMenu = $('<div>');
        $contextMenu.addClass('dropdown clearfix');
        var $ul = $('<ul>');
        $ul.addClass('dropdown-menu');
        $ul.attr({ 'role': 'menu' });
        $ul.css({
            display: 'block',
            position: 'absolute',
            left: event.pageX + 'px',
            top: event.pageY + 'px'
        });
        angular.forEach(options, function (item, i) {
            var $li = $('<li>');
            if (item === null) {
                $li.addClass('divider');
            } else {
                var $a = $('<a>');
                $a.attr({ tabindex: '-1', href: '#' });
                var text = typeof item[0] === 'string' ? item[0] : item[0].call($scope, $scope, event, model);
                $a.text(text);
                $li.append($a);
                var enabled = angular.isDefined(item[2]) ? item[2].call($scope, $scope, event, text, model) : true;
                if (enabled) {
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                        $scope.$apply(function () {
                            $(event.currentTarget).removeClass('context');
                            $contextMenu.remove();
                            item[1].call($scope, $scope, event, model);
                        });
                    });
                } else {
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                    });
                    $li.addClass('disabled');
                }
            }
            $ul.append($li);
        });
        $contextMenu.append($ul);
        var height = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        $contextMenu.css({
            width: '100%',
            height: height + 'px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999
        });
        $(document).find('body').append($contextMenu);
        $contextMenu.on("mousedown", function (e) {
            if ($(e.target).hasClass('dropdown')) {
                $(event.currentTarget).removeClass('context');
                $contextMenu.remove();
            }
        }).on('contextmenu', function (event) {
            $(event.currentTarget).removeClass('context');
            event.preventDefault();
            $contextMenu.remove();
        });
    };
    return function ($scope, element, attrs) {
        element.on('contextmenu', function (event) {
            event.stopPropagation();
            $scope.$apply(function () {
                event.preventDefault();
                var options = $scope.$eval(attrs.contextMenu);
                var model = $scope.$eval(attrs.model);
                if (options instanceof Array) {
                    if (options.length === 0) { return; }
                    renderContextMenu($scope, event, options, model);
                } else {
                    throw '"' + attrs.contextMenu + '" not an array';
                }
            });
        });
    };
}

/**
 * @ngdoc service
 * @name Utils
 *
 * @description
 *
 * @param {$q}          $q          -   {@link https://docs.angularjs.org/api/ng/service/$q}
 * @param {$timeout}    $timeout    -   {@link https://docs.angularjs.org/api/ng/service/$timeout}
 *
 * @this Utils
 */
function Utils_($q, $timeout) {
    var Utils = this;

    /**
     * @param {URL|Element.<a>} href
     * @param {Boolean} [upperKeys=false]
     * @returns {{url: string, params: {}}}
     */
    Utils.parseParams = function(href, upperKeys) {
        var _upper = upperKeys || false;

        var parser = href;
        if (angular.isString(parser)) {
            parser = document.createElement('a');
            parser.href = href;
        }

        var search = parser.search;
        if (search.indexOf("?") === 0) {
            search = search.substring(1, search.length);
        }

        var options = {};

        var params = search.split("&");
        for (var p in params) {
            if (params.hasOwnProperty(p)) {
                if(params[p].indexOf('=') !== -1) {
                    var kvp = params[p].split("=");
                    if(kvp[0]) {
                        if(kvp.length === 1) {
                            options[kvp[0]] = '';
                        }else {
                            options[kvp[0]] = decodeURIComponent(kvp[1]);
                        }
                    }
                }
            }
        }

        return {
            url: parser.protocol + "//" + parser.hostname + ((parser.port && parser.port !== 80) ? (":" + parser.port) : ("")) + parser.pathname,
            params: (_upper) ? (Utils.upperCaseKeys(options)) : (options)
        };
    };

    /**
     * Compute an url with parameter. Parameters are sorted by alphabetical order to ensure final string is always the same
     * @param {String}      url     - base url
     * @param {Object}      params  - parameters to add as KVP
     * @returns {String} final url
     */
    Utils.computeUrl = function(url, params) {

        var _url = Utils.parseParams(url);

        var _params = [];
        angular.forEach(angular.extend(_url.params, params), function(value, key){
            _params.push(angular.uppercase(key)+"="+value);
        });
        if(_params.length>0){
            return _url.url + "?" + _params.sort().join("&");
        } else {
            return _url.url;
        }

    };

    /**
     * Set all object key in uppercase and return the result.
     * If obj is not an {@link Object}, this function return the given parameter.
     * @param {Object|Array.<Object>} obj
     * @returns {Object|Array.<Object>}
     */
    Utils.upperCaseKeys = function(obj) {
        if (angular.isObject(obj)) {
            if (angular.isArray(obj)) {
                var arr = angular.copy(obj);
                angular.forEach(arr, function(_obj, index) {
                    arr[index] = Utils.upperCaseKeys(_obj);
                });
                return arr;
            }
            var params = {};
            angular.forEach(obj, function (value, key) {
                params[angular.uppercase(key)] = value;
            });
            return params;
        }
        return obj;
    };

    /**
     * Set all object key in lowercase and return the result.
     * If obj is not an {@link Object}, this function return the given parameter.
     * @param {Object|Array.<Object>} obj
     * @returns {Object|Array.<Object>}
     */
    Utils.lowerCaseKeys = function(obj) {
        if (angular.isObject(obj)) {
            if (angular.isArray(obj)) {
                var arr = angular.copy(obj);
                angular.forEach(arr, function(_obj, index) {
                    arr[index] = Utils.lowerCaseKeys(_obj);
                });
                return arr;
            }
            var params = {};
            angular.forEach(obj, function (value, key) {
                params[angular.lowercase(key)] = value;
            });
            return params;
        }
        return obj;
    };

    /**
     *
     * @param {Object}  result
     * @returns {*}
     */
    Utils.getDataOf = function (result) {
        return result.data;
    };

    /**
     *
     * @param arr
     * @param func
     * @param index
     * @param end
     *
     * @returns {Promise}
     */
    Utils.forEach = function(arr, func, index, end) {
        var deferred = $q.defer();

        var _index = index || 0;
        var _end = end || arr.length;

        if (_index < _end) {
            $q.when(func(arr[_index], _index, arr)).then(function(value){
                if (value === false) {
                    deferred.reject();
                    return;
                }

                $timeout(function(){
                    Utils.forEach(arr,func,_index+1,_end)
                        .then(deferred.resolve, deferred.reject, deferred.notify);
                });
            }, deferred.reject);
        } else {
            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     * Determines if a value is a regular expression object.
     *
     * @param {*} value Reference to check.
     * @returns {boolean} True if `value` is a `RegExp`.
     */
    Utils.isRegExp = function(value) {
        return window.toString.call(value) === '[object RegExp]'; // jshint ignore:line
    };

    Utils.mergeArray = function(dst,src) {
        if (angular.isArray(dst) && angular.isArray(src)) {
            dst.concat(src.filter(function(value) {
                return dst.indexOf(value) < 0;
            }));
        }
        return dst;
    };

    /**
     *
     * @param {*}       dst
     * @param {*}       objs
     * @param {Boolean} deep
     * @returns {*}
     */
    function baseExtend(dst, objs, deep) {
        for (var i = 0, ii = objs.length; i < ii; ++i) {
            var obj = objs[i];
            if (!angular.isObject(obj) && !angular.isFunction(obj)) {
                continue;
            }
            var keys = Object.keys(obj);
            for (var j = 0, jj = keys.length; j < jj; j++) {
                var key = keys[j];
                var src = obj[key];

                if (deep && angular.isObject(src)) {
                    if (angular.isDate(src)) {
                        dst[key] = new Date(src.valueOf());
                    } else if (Utils.isRegExp(src)) {
                        dst[key] = new RegExp(src);
                    } else if (src.nodeName) {
                        dst[key] = src.cloneNode(true);
                    } else if (angular.isElement(src)) {
                        dst[key] = src.clone();
                    } else {

                        if (angular.isArray(dst[key]) && angular.isArray(src)) {
                            if (dst[key].length > 0) {
                                if (angular.isString(dst[key][0])) {
                                    dst[key] = Utils.mergeArray(dst[key], src);
                                    continue;
                                }
                            }
                        }

                        if (!angular.isObject(dst[key])) {
                            dst[key] = angular.isArray(src) ? [] : {};
                        }
                        baseExtend(dst[key], [src], true);
                    }
                } else if (angular.isDefined(src)) {
                    dst[key] = src;
                }
            }
        }

        return dst;
    }

    /**
     * @ngdoc function
     * @module mapviewer.utils
     * @kind function
     *
     * @description
     * Deeply extends the destination object `dst` by copying own enumerable properties from the `src` object(s)
     * to `dst`. You can specify multiple `src` objects. If you want to preserve original objects, you can do so
     * by passing an empty object as the target: `var object = angular.merge({}, object1, object2)`.
     *
     * Unlike {@link angular.extend extend()}, `merge()` recursively descends into object properties of source
     * objects, performing a deep copy.
     *
     * @param {Object} dst Destination object.
     * @param {...Object} src Source object(s).
     * @returns {Object} Reference to `dst`.
     */
    Utils.merge = function(dst) {
        return baseExtend(dst, Array.prototype.slice.call(arguments, 1), true);
    };

    /**
     * Make an subjectString.endsWith function {@link https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith}
     *
     * @param {String}      subjectString
     * @param {String}      searchString
     * @param {Number}      [position]
     * @returns {boolean}
     */
    Utils.endsWith = function(subjectString, searchString, position) {
        if (typeof String.prototype.endsWith === "function") {
            return subjectString.endsWith(searchString, position);
        } else {
            if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
                position = subjectString.length;
            }
            position -= searchString.length;
            var lastIndex = subjectString.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        }
    };

    /**
     * Make an subjectString.endsWith function {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith}
     *
     * @param {String}      subjectString
     * @param {String}      searchString
     * @param {Number}      [position]
     * @returns {boolean}
     */
    Utils.startsWith = function(subjectString, searchString, position) {
        if (typeof String.prototype.startsWith === "function") {
            return subjectString.startsWith(searchString, position);
        } else {
            position = position || 0;
            return subjectString.indexOf(searchString, position) === position;
        }
    };

}

/**
 * @ngdoc filter
 * @name reverse
 */
function reverseFilter() {
    return function(array, reverse) {
        if (reverse === true && angular.isArray(array)) {
            array = array.slice().reverse();
        }
        return array;
    };
}

/**
 * @namespace airbus.shared.utils
 * @requires ng
 */
angular.module('airbus.shared.utils', ['ng'])
    .service('fullscreen', FullscreenService)
    .factory('localStorage', localStorageFactory)
    .directive('autofocus', autofocusDirective)
    .directive('datepicker', datepicker)
    .directive('contextMenu', contextmenu)
    .service("Utils", Utils_)
    .filter("reverse", reverseFilter);

