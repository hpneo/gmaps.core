(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var _forEach = require('lodash-compat/collection/forEach'),
    _map = require('lodash-compat/collection/map'),
    _forIn = require('lodash-compat/object/forIn'),
    _extend = require('lodash-compat/object/extend'),
    _omit = require('lodash-compat/object/omit'),
    querySelectorAll = require('query-selector'),
    isGoogleMapsRegistered = (typeof window.google === 'object' && window.google.maps),
    doc = window.document,
    nativeMethods = [
      'setCenter', 'streetView_changed', 'getDiv', 'panBy', 'panTo',
      'panToBounds', 'fitBounds', 'getBounds', 'getStreetView', 'setStreetView',
      'getCenter', 'getZoom', 'setZoom', 'getMapTypeId', 'setMapTypeId', 'getProjection',
      'getHeading', 'setHeading', 'getTilt', 'setTilt', 'get', 'set', 'notify', 'setValues',
      'setOptions', 'changed', 'bindTo', 'unbind', 'unbindAll', 'addListener'
    ];

if (!isGoogleMapsRegistered) {
  throw 'Google Maps API is required. Please register the following JavaScript library in your site: http://maps.google.com/maps/api/js?sensor=true';
}

function querySelector() {
  return querySelectorAll.apply(doc, arguments)[0];
}

function coordsToLatLngs(coords, useGeoJSON) {
  var firstCoordinate = coords[0],
      secondCoordinate = coords[1];

  if (useGeoJSON) {
    firstCoordinate = coords[1];
    secondCoordinate = coords[0];
  }

  return new google.maps.LatLng(firstCoordinate, secondCoordinate);
}

function arrayToLatLng(coords, useGeoJSON) {
  var coordinates = _map(coords, function(coordinate) {
    var isGoogleLatLng = (coordinate instanceof google.maps.LatLng),
        looksLikeMultiDimensionalArray = (coordinate.length > 0 && typeof coordinate[0] === 'object');

    if (!isGoogleLatLng) {
      if (looksLikeMultiDimensionalArray) {
        coordinate = arrayToLatLng(coordinate, useGeoJSON);
      }
      else {
        coordinate = coordsToLatLngs(coordinate, useGeoJSON);
      }
    }

    return coordinate;
  });

  return coordinates;
}

function findAbsolutePosition(element)  {
  var left = 0,
      top = 0,
      absolutePosition = {};

  if (element.offsetParent) {
    do {
      left += element.offsetLeft;
      top += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  absolutePosition.left = left;
  absolutePosition.top = top;

  return absolutePosition;
}

function buildContextMenuContent(gmaps, control, rightClickEvent) {
  var html = '',
      controlOptions = gmaps.contextMenu[control],
      contextMenuElement = querySelector('#gmaps_context_menu_' + gmaps._id),
      contextMenuItems;

  if (!contextMenuElement) {
    return;
  }

  _forIn(controlOptions, function(option, key) {
    if (controlOptions.hasOwnProperty(key)) {
      html += '<li><a id="' + control + '_' + key + '" href="#">' + option.title + '</a></li>';
    }
  });

  contextMenuElement.innerHTML = html;
  contextMenuItems = contextMenuElement.getElementsByTagName('a');

  function assignMenuItemAction(clickEvent) {
    clickEvent.preventDefault();

    var controlKey = this.id.replace(control + '_', '');

    controlOptions[controlKey].action.call(gmaps, rightClickEvent);

    gmaps.hideContextMenu();
  }

  _forEach(contextMenuItems, function(contextMenuItem) {
    google.maps.event.clearListeners(contextMenuItem, 'click');
    google.maps.event.addDomListenerOnce(contextMenuItem, 'click', assignMenuItemAction, false);
  });

  var position = findAbsolutePosition(gmaps.element),
      left = position.left + rightClickEvent.pixel.x - 15,
      top = position.top + rightClickEvent.pixel.y - 15;

  contextMenuElement.style.left = left + 'px';
  contextMenuElement.style.top = top + 'px';
  contextMenuElement.style.display = 'block';
}

function setupListener(gmaps, object, eventName, listener) {
  google.maps.event.addListener(object, eventName, function(mapEvent) {
    if (!mapEvent) {
      mapEvent = gmaps;
    }

    listener.call(gmaps, mapEvent);

    gmaps.hideContextMenu();
  });
}

function GMaps(options) {
  if (!this) {
    return new GMaps(options);
  }

  var self = this,
      optionsToDelete = [
        'el', 'div', 'lat', 'lng', 'mapType', 'width',
        'height', 'markerClusterer', 'enableNewStyle'
      ],
      hidingContextMenuEvents = [
        'bounds_changed', 'center_changed', 'click', 'dblclick', 'drag',
        'dragend', 'dragstart', 'idle', 'maptypeid_changed', 'projection_changed',
        'resize', 'tilesloaded', 'zoom_changed'
      ],
      notHidingContextMenuEvents = ['mousemove', 'mouseout', 'mouseover'],
      containerIdentifier = options.el || options.div,
      zoom = options.zoom || 15,
      mapType = google.maps.MapTypeId[(options.mapType || 'roadmap').toUpperCase()],
      mapCenter = new google.maps.LatLng(options.lat, options.lng),
      markerClustererFunction = options.markerClusterer,
      zoomControl = options.zoomControl || true,
      zoomControlOptions = options.zoomControlOptions || {
        style: 'default',
        position: 'top_left'
      },
      panControl = options.panControl || true,
      mapTypeControl = options.mapTypeControl || true,
      scaleControl = options.scaleControl || true,
      streetViewControl = options.streetViewControl || true,
      overviewMapControl = options.overviewMapControl || true,
      mapBaseOptions = {
        zoom: zoom,
        mapTypeId: mapType,
        center: mapCenter
      },
      mapControlsOptions = {
        panControl: panControl,
        zoomControl: zoomControl,
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle[(zoomControlOptions.style || 'default').toUpperCase()],
          position: google.maps.ControlPosition[(zoomControlOptions.position || 'top_left').toUpperCase()]
        },
        mapTypeControl: mapTypeControl,
        scaleControl: scaleControl,
        streetViewControl: streetViewControl,
        overviewMapControl: overviewMapControl
      },
      mapOptions;

  if (typeof options.el === 'string' || typeof options.div === 'string') {
    this.element = querySelector(containerIdentifier, options.context);
  } else {
    this.element = containerIdentifier;
  }

  if (!this.element) {
    throw 'No element defined.';
  }

  this.contextMenu = {};
  this.controls = [];
  this.overlays = [];
  this.layers = []; // array with kml/georss and fusiontables layers, can be as many
  this.singleLayers = {}; // object with the other layers, only one per layer
  this.markers = [];
  this.polylines = [];
  this.routes = [];
  this.polygons = [];
  this.infoWindow = null;
  this.overlayElement = this.overlayEl = null;
  this.zoom = zoom;
  this.registeredEvents = {};
  this.element.style.width = options.width || this.element.scrollWidth || this.element.offsetWidth;
  this.element.style.height = options.height || this.element.scrollHeight || this.element.offsetHeight;
  this._id = Date.now() + '_' + Math.ceil(Math.random() * Date.now());

  google.maps.visualRefresh = options.enableNewStyle;

  if (options.disableDefaultUI !== true) {
    mapBaseOptions = _extend(mapBaseOptions, mapControlsOptions);
  }

  mapOptions = _extend(mapBaseOptions, options);
  mapOptions = _omit(mapOptions, optionsToDelete);
  mapOptions = _omit(mapOptions, hidingContextMenuEvents);
  mapOptions = _omit(mapOptions, notHidingContextMenuEvents);

  this.map = new google.maps.Map(this.element, mapOptions);

  _forEach(hidingContextMenuEvents, function(eventName) {
    if (eventName in options) {
      setupListener(self, self.map, eventName, options[eventName]);
    }
  });

  _forEach(notHidingContextMenuEvents, function(eventName) {
    if (eventName in options) {
      setupListener(self, self.map, eventName, options[eventName]);
    }
  });

  google.maps.event.addListener(this.map, 'zoom_changed', this.hideContextMenu);
  google.maps.event.addListener(this.map, 'rightclick', function(rightClickEvent) {
    if (typeof options.rightclick === 'function') {
      options.rightclick.call(this, rightClickEvent);
    }

    if (self.contextMenu.map) {
      self.buildContextMenu('map', rightClickEvent);
    }
  });

  if (typeof markerClustererFunction === 'function') {
    this.markerClusterer = markerClustererFunction.apply(this, [this.map]);
  }
}

for (var counter = 0; counter < nativeMethods.length; counter++) {
  (function(gmapsPrototype, methodName) {
    gmapsPrototype[methodName] = function() {
      return this.map[methodName].apply(this.map, arguments);
    };
  })(GMaps.prototype, nativeMethods[counter]);
}

GMaps.prototype.refresh = function() {
  google.maps.event.trigger(this.map, 'resize');
};

GMaps.prototype.fitZoom = function() {
  var latLngs = [];

  _forEach(this.markers, function(marker) {
    if (marker.visible === true) {
      latLngs.push(marker.getPosition());
    }
  });

  if (latLngs.length > 0) {
    this.fitLatLngBounds(latLngs);
  }
};

GMaps.prototype.fitLatLngBounds = function(latLngs) {
  var bounds = new google.maps.LatLngBounds();

  _forEach(latLngs, function(latLng) {
    bounds.extend(latLng);
  });

  if (!bounds.isEmpty()) {
    this.map.fitBounds(bounds);
  }
};

GMaps.prototype.setCenter = function(lat, lng, callback) {
  this.map.panTo(new google.maps.LatLng(lat, lng));

  if (typeof callback === 'function') {
    callback.call(this, lat, lng);
  }
};

GMaps.prototype.getElement = function() {
  return this.element;
};

GMaps.prototype.zoomIn = function(value) {
  value = value || 1;

  this.zoom = this.map.getZoom() + value;
  this.map.setZoom(this.zoom);
};

GMaps.prototype.zoomOut = function(value) {
  value = value || 1;

  this.zoom = this.map.getZoom() - value;
  this.map.setZoom(this.zoom);
};

GMaps.prototype.buildContextMenu = function(control, rightClickEvent) {
  var self = this;

  if (control === 'marker') {
    var overlay = new google.maps.OverlayView();

    overlay.setMap(self.map);

    overlay.draw = function() {
      var projection = overlay.getProjection(),
          position = rightClickEvent.marker.getPosition();

      rightClickEvent.pixel = projection.fromLatLngToContainerPixel(position);

      buildContextMenuContent(self, control, rightClickEvent);
    };
  }
  else {
    buildContextMenuContent(self, control, rightClickEvent);
  }
};

GMaps.prototype.getContextMenu = function() {
  return querySelector('#gmaps_context_menu_' + this._id);
};

GMaps.prototype.setContextMenu = function(options) {
  var contextMenuElement = doc.createElement('ul'),
      contextMenuControlType = options.control,
      contextMenuOptions = options.options,
      contextMenu = {};

  _forIn(contextMenuOptions, function(option, key) {
    if (contextMenuOptions.hasOwnProperty(key)) {
      contextMenu[option.name] = {
        title: option.title,
        action: option.action
      };
    }
  });

  this.contextMenu[contextMenuControlType] = contextMenu;

  contextMenuElement.id = 'gmaps_context_menu_' + this._id;
  contextMenuElement.style.display = 'none';
  contextMenuElement.style.position = 'absolute';
  contextMenuElement.style.minWidth = '100px';
  contextMenuElement.style.background = 'white';
  contextMenuElement.style.listStyle = 'none';
  contextMenuElement.style.padding = '8px';
  contextMenuElement.style.boxShadow = '2px 2px 6px #ccc';

  doc.body.appendChild(contextMenuElement);

  google.maps.event.addDomListener(contextMenuElement, 'mouseout', function(mouseOutEvent) {
    if (!mouseOutEvent.relatedTarget || !this.contains(mouseOutEvent.relatedTarget)) {
      window.setTimeout(function() {
        contextMenuElement.style.display = 'none';
      }, 400);
    }
  }, false);
};

GMaps.prototype.hideContextMenu = function() {
  var contextMenuElement = querySelector('#gmaps_context_menu_' + this._id);

  if (contextMenuElement) {
    contextMenuElement.style.display = 'none';
  }
};

GMaps.arrayToLatLng = arrayToLatLng;
GMaps.coordsToLatLngs = coordsToLatLngs;

global.GMaps = GMaps;
module.exports = GMaps;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash-compat/collection/forEach":3,"lodash-compat/collection/map":4,"lodash-compat/object/extend":68,"lodash-compat/object/forIn":69,"lodash-compat/object/omit":72,"query-selector":78}],2:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array ? array.length : 0;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],3:[function(require,module,exports){
var arrayEach = require('../internal/arrayEach'),
    baseEach = require('../internal/baseEach'),
    createForEach = require('../internal/createForEach');

/**
 * Iterates over elements of `collection` invoking `iteratee` for each element.
 * The `iteratee` is bound to `thisArg` and invoked with three arguments:
 * (value, index|key, collection). Iteratee functions may exit iteration early
 * by explicitly returning `false`.
 *
 * **Note:** As with other "Collections" methods, objects with a "length" property
 * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
 * may be used for object iteration.
 *
 * @static
 * @memberOf _
 * @alias each
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array|Object|string} Returns `collection`.
 * @example
 *
 * _([1, 2]).forEach(function(n) {
 *   console.log(n);
 * }).value();
 * // => logs each value from left to right and returns the array
 *
 * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
 *   console.log(n, key);
 * });
 * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
 */
var forEach = createForEach(arrayEach, baseEach);

module.exports = forEach;

},{"../internal/arrayEach":7,"../internal/baseEach":14,"../internal/createForEach":39}],4:[function(require,module,exports){
var arrayMap = require('../internal/arrayMap'),
    baseCallback = require('../internal/baseCallback'),
    baseMap = require('../internal/baseMap'),
    isArray = require('../lang/isArray');

/**
 * Creates an array of values by running each element in `collection` through
 * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
 * arguments: (value, index|key, collection).
 *
 * If a property name is provided for `iteratee` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `iteratee` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * Many lodash methods are guarded to work as interatees for methods like
 * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
 *
 * The guarded methods are:
 * `ary`, `callback`, `chunk`, `clone`, `create`, `curry`, `curryRight`,
 * `drop`, `dropRight`, `every`, `fill`, `flatten`, `invert`, `max`, `min`,
 * `parseInt`, `slice`, `sortBy`, `take`, `takeRight`, `template`, `trim`,
 * `trimLeft`, `trimRight`, `trunc`, `random`, `range`, `sample`, `some`,
 * `sum`, `uniq`, and `words`
 *
 * @static
 * @memberOf _
 * @alias collect
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function|Object|string} [iteratee=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array} Returns the new mapped array.
 * @example
 *
 * function timesThree(n) {
 *   return n * 3;
 * }
 *
 * _.map([1, 2], timesThree);
 * // => [3, 6]
 *
 * _.map({ 'a': 1, 'b': 2 }, timesThree);
 * // => [3, 6] (iteration order is not guaranteed)
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * // using the `_.property` callback shorthand
 * _.map(users, 'user');
 * // => ['barney', 'fred']
 */
function map(collection, iteratee, thisArg) {
  var func = isArray(collection) ? arrayMap : baseMap;
  iteratee = baseCallback(iteratee, thisArg, 3);
  return func(collection, iteratee);
}

module.exports = map;

},{"../internal/arrayMap":8,"../internal/baseCallback":11,"../internal/baseMap":25,"../lang/isArray":61}],5:[function(require,module,exports){
/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],6:[function(require,module,exports){
(function (global){
var cachePush = require('./cachePush'),
    isNative = require('../lang/isNative');

/** Native method references. */
var Set = isNative(Set = global.Set) && Set;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate;

/**
 *
 * Creates a cache object to store unique values.
 *
 * @private
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var length = values ? values.length : 0;

  this.data = { 'hash': nativeCreate(null), 'set': new Set };
  while (length--) {
    this.push(values[length]);
  }
}

// Add functions to the `Set` cache.
SetCache.prototype.push = cachePush;

module.exports = SetCache;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lang/isNative":63,"./cachePush":34}],7:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],8:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],9:[function(require,module,exports){
var getSymbols = require('./getSymbols'),
    keys = require('../object/keys');

/** Used for native method references. */
var arrayProto = Array.prototype;

/** Native method references. */
var push = arrayProto.push;

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var props = keys(source);
  push.apply(props, getSymbols(source));

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

module.exports = assignWith;

},{"../object/keys":70,"./getSymbols":45}],10:[function(require,module,exports){
var baseCopy = require('./baseCopy'),
    getSymbols = require('./getSymbols'),
    isNative = require('../lang/isNative'),
    keys = require('../object/keys');

/** Native method references. */
var preventExtensions = isNative(preventExtensions = Object.preventExtensions) && preventExtensions;

/** Used as `baseAssign`. */
var nativeAssign = (function() {
  // Avoid `Object.assign` in Firefox 34-37 which have an early implementation
  // with a now defunct try/catch behavior. See https://bugzilla.mozilla.org/show_bug.cgi?id=1103344
  // for more details.
  //
  // Use `Object.preventExtensions` on a plain object instead of simply using
  // `Object('x')` because Chrome and IE fail to throw an error when attempting
  // to assign values to readonly indexes of strings.
  var func = preventExtensions && isNative(func = Object.assign) && func;
  try {
    if (func) {
      var object = preventExtensions({ '1': 0 });
      object[0] = 1;
    }
  } catch(e) {
    // Only attempt in strict mode.
    try { func(object, 'xo'); } catch(e) {}
    return !object[1] && func;
  }
  return false;
}());

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
var baseAssign = nativeAssign || function(object, source) {
  return source == null
    ? object
    : baseCopy(source, getSymbols(source), baseCopy(source, keys(source), object));
};

module.exports = baseAssign;

},{"../lang/isNative":63,"../object/keys":70,"./baseCopy":12,"./getSymbols":45}],11:[function(require,module,exports){
var baseMatches = require('./baseMatches'),
    baseMatchesProperty = require('./baseMatchesProperty'),
    bindCallback = require('./bindCallback'),
    identity = require('../utility/identity'),
    property = require('../utility/property');

/**
 * The base implementation of `_.callback` which supports specifying the
 * number of arguments to provide to `func`.
 *
 * @private
 * @param {*} [func=_.identity] The value to convert to a callback.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function baseCallback(func, thisArg, argCount) {
  var type = typeof func;
  if (type == 'function') {
    return thisArg === undefined
      ? func
      : bindCallback(func, thisArg, argCount);
  }
  if (func == null) {
    return identity;
  }
  if (type == 'object') {
    return baseMatches(func);
  }
  return thisArg === undefined
    ? property(func)
    : baseMatchesProperty(func, thisArg);
}

module.exports = baseCallback;

},{"../utility/identity":76,"../utility/property":77,"./baseMatches":26,"./baseMatchesProperty":27,"./bindCallback":32}],12:[function(require,module,exports){
/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],13:[function(require,module,exports){
var baseIndexOf = require('./baseIndexOf'),
    cacheIndexOf = require('./cacheIndexOf'),
    createCache = require('./createCache');

/**
 * The base implementation of `_.difference` which accepts a single array
 * of values to exclude.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Array} values The values to exclude.
 * @returns {Array} Returns the new array of filtered values.
 */
function baseDifference(array, values) {
  var length = array ? array.length : 0,
      result = [];

  if (!length) {
    return result;
  }
  var index = -1,
      indexOf = baseIndexOf,
      isCommon = true,
      cache = (isCommon && values.length >= 200) ? createCache(values) : null,
      valuesLength = values.length;

  if (cache) {
    indexOf = cacheIndexOf;
    isCommon = false;
    values = cache;
  }
  outer:
  while (++index < length) {
    var value = array[index];

    if (isCommon && value === value) {
      var valuesIndex = valuesLength;
      while (valuesIndex--) {
        if (values[valuesIndex] === value) {
          continue outer;
        }
      }
      result.push(value);
    }
    else if (indexOf(values, value, 0) < 0) {
      result.push(value);
    }
  }
  return result;
}

module.exports = baseDifference;

},{"./baseIndexOf":20,"./cacheIndexOf":33,"./createCache":38}],14:[function(require,module,exports){
var baseForOwn = require('./baseForOwn'),
    createBaseEach = require('./createBaseEach');

/**
 * The base implementation of `_.forEach` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object|string} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

module.exports = baseEach;

},{"./baseForOwn":18,"./createBaseEach":36}],15:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isArrayLike = require('./isArrayLike'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict) {
  var index = -1,
      length = array.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        value = baseFlatten(value, isDeep, isStrict);
      }
      var valIndex = -1,
          valLength = value.length;

      while (++valIndex < valLength) {
        result[++resIndex] = value[valIndex];
      }
    } else if (!isStrict) {
      result[++resIndex] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"../lang/isArguments":60,"../lang/isArray":61,"./isArrayLike":47,"./isObjectLike":53}],16:[function(require,module,exports){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./createBaseFor":37}],17:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keysIn = require('../object/keysIn');

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

module.exports = baseForIn;

},{"../object/keysIn":71,"./baseFor":16}],18:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"../object/keys":70,"./baseFor":16}],19:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * The base implementation of `get` without support for string paths
 * and default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path of the property to get.
 * @param {string} [pathKey] The key representation of path.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path, pathKey) {
  if (object == null) {
    return;
  }
  object = toObject(object);
  if (pathKey !== undefined && pathKey in object) {
    path = [pathKey];
  }
  var index = -1,
      length = path.length;

  while (object != null && ++index < length) {
    object = toObject(object)[path[index]];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./toObject":58}],20:[function(require,module,exports){
var indexOfNaN = require('./indexOfNaN');

/**
 * The base implementation of `_.indexOf` without support for binary searches.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return indexOfNaN(array, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOf;

},{"./indexOfNaN":46}],21:[function(require,module,exports){
var baseIsEqualDeep = require('./baseIsEqualDeep');

/**
 * The base implementation of `_.isEqual` without support for `this` binding
 * `customizer` functions.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
  // Exit early for identical values.
  if (value === other) {
    return true;
  }
  var valType = typeof value,
      othType = typeof other;

  // Exit early for unlike primitive values.
  if ((valType != 'function' && valType != 'object' && othType != 'function' && othType != 'object') ||
      value == null || other == null) {
    // Return `false` unless both values are `NaN`.
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
}

module.exports = baseIsEqual;

},{"./baseIsEqualDeep":22}],22:[function(require,module,exports){
var equalArrays = require('./equalArrays'),
    equalByTag = require('./equalByTag'),
    equalObjects = require('./equalObjects'),
    isArray = require('../lang/isArray'),
    isHostObject = require('./isHostObject'),
    isTypedArray = require('../lang/isTypedArray');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA=[]] Tracks traversed `value` objects.
 * @param {Array} [stackB=[]] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = arrayTag,
      othTag = arrayTag;

  if (!objIsArr) {
    objTag = objToString.call(object);
    if (objTag == argsTag) {
      objTag = objectTag;
    } else if (objTag != objectTag) {
      objIsArr = isTypedArray(object);
    }
  }
  if (!othIsArr) {
    othTag = objToString.call(other);
    if (othTag == argsTag) {
      othTag = objectTag;
    } else if (othTag != objectTag) {
      othIsArr = isTypedArray(other);
    }
  }
  var objIsObj = objTag == objectTag && !isHostObject(object),
      othIsObj = othTag == objectTag && !isHostObject(other),
      isSameTag = objTag == othTag;

  if (isSameTag && !(objIsArr || objIsObj)) {
    return equalByTag(object, other, objTag);
  }
  if (!isLoose) {
    var valWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (valWrapped || othWrapped) {
      return equalFunc(valWrapped ? object.value() : object, othWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
    }
  }
  if (!isSameTag) {
    return false;
  }
  // Assume cyclic values are equal.
  // For more information on detecting circular references see https://es5.github.io/#JO.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == object) {
      return stackB[length] == other;
    }
  }
  // Add `object` and `other` to the stack of traversed objects.
  stackA.push(object);
  stackB.push(other);

  var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

  stackA.pop();
  stackB.pop();

  return result;
}

module.exports = baseIsEqualDeep;

},{"../lang/isArray":61,"../lang/isTypedArray":66,"./equalArrays":41,"./equalByTag":42,"./equalObjects":43,"./isHostObject":48}],23:[function(require,module,exports){
/**
 * The base implementation of `_.isFunction` without support for environments
 * with incorrect `typeof` results.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 */
function baseIsFunction(value) {
  // Avoid a Chakra JIT bug in compatibility modes of IE 11.
  // See https://github.com/jashkenas/underscore/issues/1621 for more details.
  return typeof value == 'function' || false;
}

module.exports = baseIsFunction;

},{}],24:[function(require,module,exports){
var baseIsEqual = require('./baseIsEqual');

/**
 * The base implementation of `_.isMatch` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} props The source property names to match.
 * @param {Array} values The source values to match.
 * @param {Array} strictCompareFlags Strict comparison flags for source values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, props, values, strictCompareFlags, customizer) {
  var index = -1,
      length = props.length,
      noCustomizer = !customizer;

  while (++index < length) {
    if ((noCustomizer && strictCompareFlags[index])
          ? values[index] !== object[props[index]]
          : !(props[index] in object)
        ) {
      return false;
    }
  }
  index = -1;
  while (++index < length) {
    var key = props[index],
        objValue = object[key],
        srcValue = values[index];

    if (noCustomizer && strictCompareFlags[index]) {
      var result = objValue !== undefined || (key in object);
    } else {
      result = customizer ? customizer(objValue, srcValue, key) : undefined;
      if (result === undefined) {
        result = baseIsEqual(srcValue, objValue, customizer, true);
      }
    }
    if (!result) {
      return false;
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./baseIsEqual":21}],25:[function(require,module,exports){
var baseEach = require('./baseEach'),
    isArrayLike = require('./isArrayLike');

/**
 * The base implementation of `_.map` without support for callback shorthands
 * and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function baseMap(collection, iteratee) {
  var index = -1,
      result = isArrayLike(collection) ? Array(collection.length) : [];

  baseEach(collection, function(value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}

module.exports = baseMap;

},{"./baseEach":14,"./isArrayLike":47}],26:[function(require,module,exports){
var baseIsMatch = require('./baseIsMatch'),
    constant = require('../utility/constant'),
    isStrictComparable = require('./isStrictComparable'),
    keys = require('../object/keys'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.matches` which does not clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new function.
 */
function baseMatches(source) {
  var props = keys(source),
      length = props.length;

  if (!length) {
    return constant(true);
  }
  if (length == 1) {
    var key = props[0],
        value = source[key];

    if (isStrictComparable(value)) {
      return function(object) {
        if (object == null) {
          return false;
        }
        object = toObject(object);
        return object[key] === value && (value !== undefined || (key in object));
      };
    }
  }
  var values = Array(length),
      strictCompareFlags = Array(length);

  while (length--) {
    value = source[props[length]];
    values[length] = value;
    strictCompareFlags[length] = isStrictComparable(value);
  }
  return function(object) {
    return object != null && baseIsMatch(toObject(object), props, values, strictCompareFlags);
  };
}

module.exports = baseMatches;

},{"../object/keys":70,"../utility/constant":75,"./baseIsMatch":24,"./isStrictComparable":54,"./toObject":58}],27:[function(require,module,exports){
var baseGet = require('./baseGet'),
    baseIsEqual = require('./baseIsEqual'),
    baseSlice = require('./baseSlice'),
    isArray = require('../lang/isArray'),
    isKey = require('./isKey'),
    isStrictComparable = require('./isStrictComparable'),
    last = require('../array/last'),
    toObject = require('./toObject'),
    toPath = require('./toPath');

/**
 * The base implementation of `_.matchesProperty` which does not which does
 * not clone `value`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} value The value to compare.
 * @returns {Function} Returns the new function.
 */
function baseMatchesProperty(path, value) {
  var isArr = isArray(path),
      isCommon = isKey(path) && isStrictComparable(value),
      pathKey = (path + '');

  path = toPath(path);
  return function(object) {
    if (object == null) {
      return false;
    }
    var key = pathKey;
    object = toObject(object);
    if ((isArr || !isCommon) && !(key in object)) {
      object = path.length == 1 ? object : baseGet(object, baseSlice(path, 0, -1));
      if (object == null) {
        return false;
      }
      key = last(path);
      object = toObject(object);
    }
    return object[key] === value
      ? (value !== undefined || (key in object))
      : baseIsEqual(value, object[key], null, true);
  };
}

module.exports = baseMatchesProperty;

},{"../array/last":2,"../lang/isArray":61,"./baseGet":19,"./baseIsEqual":21,"./baseSlice":30,"./isKey":51,"./isStrictComparable":54,"./toObject":58,"./toPath":59}],28:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : toObject(object)[key];
  };
}

module.exports = baseProperty;

},{"./toObject":58}],29:[function(require,module,exports){
var baseGet = require('./baseGet'),
    toPath = require('./toPath');

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 */
function basePropertyDeep(path) {
  var pathKey = (path + '');
  path = toPath(path);
  return function(object) {
    return baseGet(object, path, pathKey);
  };
}

module.exports = basePropertyDeep;

},{"./baseGet":19,"./toPath":59}],30:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  start = start == null ? 0 : (+start || 0);
  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = (end === undefined || end > length) ? length : (+end || 0);
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],31:[function(require,module,exports){
/**
 * Converts `value` to a string if it is not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  if (typeof value == 'string') {
    return value;
  }
  return value == null ? '' : (value + '');
}

module.exports = baseToString;

},{}],32:[function(require,module,exports){
var identity = require('../utility/identity');

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

module.exports = bindCallback;

},{"../utility/identity":76}],33:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Checks if `value` is in `cache` mimicking the return signature of
 * `_.indexOf` by returning `0` if the value is found, else `-1`.
 *
 * @private
 * @param {Object} cache The cache to search.
 * @param {*} value The value to search for.
 * @returns {number} Returns `0` if `value` is found, else `-1`.
 */
function cacheIndexOf(cache, value) {
  var data = cache.data,
      result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

  return result ? 0 : -1;
}

module.exports = cacheIndexOf;

},{"../lang/isObject":64}],34:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Adds `value` to the cache.
 *
 * @private
 * @name push
 * @memberOf SetCache
 * @param {*} value The value to cache.
 */
function cachePush(value) {
  var data = this.data;
  if (typeof value == 'string' || isObject(value)) {
    data.set.add(value);
  } else {
    data.hash[value] = true;
  }
}

module.exports = cachePush;

},{"../lang/isObject":64}],35:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isIterateeCall = require('./isIterateeCall'),
    restParam = require('../function/restParam');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 && sources[length - 2],
        guard = length > 2 && sources[2],
        thisArg = length > 1 && sources[length - 1];

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : null;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? null : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"../function/restParam":5,"./bindCallback":32,"./isIterateeCall":50}],36:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength'),
    toObject = require('./toObject');

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    var length = collection ? getLength(collection) : 0;
    if (!isLength(length)) {
      return eachFunc(collection, iteratee);
    }
    var index = fromRight ? length : -1,
        iterable = toObject(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

module.exports = createBaseEach;

},{"./getLength":44,"./isLength":52,"./toObject":58}],37:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"./toObject":58}],38:[function(require,module,exports){
(function (global){
var SetCache = require('./SetCache'),
    constant = require('../utility/constant'),
    isNative = require('../lang/isNative');

/** Native method references. */
var Set = isNative(Set = global.Set) && Set;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate;

/**
 * Creates a `Set` cache object to optimize linear searches of large arrays.
 *
 * @private
 * @param {Array} [values] The values to cache.
 * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
 */
var createCache = !(nativeCreate && Set) ? constant(null) : function(values) {
  return new SetCache(values);
};

module.exports = createCache;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lang/isNative":63,"../utility/constant":75,"./SetCache":6}],39:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isArray = require('../lang/isArray');

/**
 * Creates a function for `_.forEach` or `_.forEachRight`.
 *
 * @private
 * @param {Function} arrayFunc The function to iterate over an array.
 * @param {Function} eachFunc The function to iterate over a collection.
 * @returns {Function} Returns the new each function.
 */
function createForEach(arrayFunc, eachFunc) {
  return function(collection, iteratee, thisArg) {
    return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
      ? arrayFunc(collection, iteratee)
      : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
  };
}

module.exports = createForEach;

},{"../lang/isArray":61,"./bindCallback":32}],40:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    keysIn = require('../object/keysIn');

/**
 * Creates a function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {Function} objectFunc The function to iterate over an object.
 * @returns {Function} Returns the new each function.
 */
function createForIn(objectFunc) {
  return function(object, iteratee, thisArg) {
    if (typeof iteratee != 'function' || thisArg !== undefined) {
      iteratee = bindCallback(iteratee, thisArg, 3);
    }
    return objectFunc(object, iteratee, keysIn);
  };
}

module.exports = createForIn;

},{"../object/keysIn":71,"./bindCallback":32}],41:[function(require,module,exports){
/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing arrays.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var index = -1,
      arrLength = array.length,
      othLength = other.length,
      result = true;

  if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
    return false;
  }
  // Deep compare the contents, ignoring non-numeric properties.
  while (result && ++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    result = undefined;
    if (customizer) {
      result = isLoose
        ? customizer(othValue, arrValue, index)
        : customizer(arrValue, othValue, index);
    }
    if (result === undefined) {
      // Recursively compare arrays (susceptible to call stack limits).
      if (isLoose) {
        var othIndex = othLength;
        while (othIndex--) {
          othValue = other[othIndex];
          result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
          if (result) {
            break;
          }
        }
      } else {
        result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
      }
    }
  }
  return !!result;
}

module.exports = equalArrays;

},{}],42:[function(require,module,exports){
/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} value The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag) {
  switch (tag) {
    case boolTag:
    case dateTag:
      // Coerce dates and booleans to numbers, dates to milliseconds and booleans
      // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
      return +object == +other;

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case numberTag:
      // Treat `NaN` vs. `NaN` as equal.
      return (object != +object)
        ? other != +other
        : object == +other;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings primitives and string
      // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
      return object == (other + '');
  }
  return false;
}

module.exports = equalByTag;

},{}],43:[function(require,module,exports){
var keys = require('../object/keys');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objProps = keys(object),
      objLength = objProps.length,
      othProps = keys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isLoose) {
    return false;
  }
  var skipCtor = isLoose,
      index = -1;

  while (++index < objLength) {
    var key = objProps[index],
        result = isLoose ? key in other : hasOwnProperty.call(other, key);

    if (result) {
      var objValue = object[key],
          othValue = other[key];

      result = undefined;
      if (customizer) {
        result = isLoose
          ? customizer(othValue, objValue, key)
          : customizer(objValue, othValue, key);
      }
      if (result === undefined) {
        // Recursively compare objects (susceptible to call stack limits).
        result = (objValue && objValue === othValue) || equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB);
      }
    }
    if (!result) {
      return false;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (!skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      return false;
    }
  }
  return true;
}

module.exports = equalObjects;

},{"../object/keys":70}],44:[function(require,module,exports){
var baseProperty = require('./baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"./baseProperty":28}],45:[function(require,module,exports){
var constant = require('../utility/constant'),
    isNative = require('../lang/isNative'),
    toObject = require('./toObject');

/** Native method references. */
var getOwnPropertySymbols = isNative(getOwnPropertySymbols = Object.getOwnPropertySymbols) && getOwnPropertySymbols;

/**
 * Creates an array of the own symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !getOwnPropertySymbols ? constant([]) : function(object) {
  return getOwnPropertySymbols(toObject(object));
};

module.exports = getSymbols;

},{"../lang/isNative":63,"../utility/constant":75,"./toObject":58}],46:[function(require,module,exports){
/**
 * Gets the index at which the first occurrence of `NaN` is found in `array`.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched `NaN`, else `-1`.
 */
function indexOfNaN(array, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 0 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    var other = array[index];
    if (other !== other) {
      return index;
    }
  }
  return -1;
}

module.exports = indexOfNaN;

},{}],47:[function(require,module,exports){
var getLength = require('./getLength'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

module.exports = isArrayLike;

},{"./getLength":44,"./isLength":52}],48:[function(require,module,exports){
/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
var isHostObject = (function() {
  try {
    Object({ 'toString': 0 } + '');
  } catch(e) {
    return function() { return false; };
  }
  return function(value) {
    // IE < 9 presents many host objects as `Object` objects that can coerce
    // to strings despite having improperly defined `toString` methods.
    return typeof value.toString != 'function' && typeof (value + '') == 'string';
  };
}());

module.exports = isHostObject;

},{}],49:[function(require,module,exports){
/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = +value;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

},{}],50:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isIndex = require('./isIndex'),
    isObject = require('../lang/isObject');

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

module.exports = isIterateeCall;

},{"../lang/isObject":64,"./isArrayLike":47,"./isIndex":49}],51:[function(require,module,exports){
var isArray = require('../lang/isArray'),
    toObject = require('./toObject');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  var type = typeof value;
  if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
    return true;
  }
  if (isArray(value)) {
    return false;
  }
  var result = !reIsDeepProp.test(value);
  return result || (object != null && value in toObject(object));
}

module.exports = isKey;

},{"../lang/isArray":61,"./toObject":58}],52:[function(require,module,exports){
/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],53:[function(require,module,exports){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],54:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

module.exports = isStrictComparable;

},{"../lang/isObject":64}],55:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * A specialized version of `_.pick` which picks `object` properties specified
 * by `props`.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property names to pick.
 * @returns {Object} Returns the new object.
 */
function pickByArray(object, props) {
  object = toObject(object);

  var index = -1,
      length = props.length,
      result = {};

  while (++index < length) {
    var key = props[index];
    if (key in object) {
      result[key] = object[key];
    }
  }
  return result;
}

module.exports = pickByArray;

},{"./toObject":58}],56:[function(require,module,exports){
var baseForIn = require('./baseForIn');

/**
 * A specialized version of `_.pick` which picks `object` properties `predicate`
 * returns truthy for.
 *
 * @private
 * @param {Object} object The source object.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Object} Returns the new object.
 */
function pickByCallback(object, predicate) {
  var result = {};
  baseForIn(object, function(value, key, object) {
    if (predicate(value, key, object)) {
      result[key] = value;
    }
  });
  return result;
}

module.exports = pickByCallback;

},{"./baseForIn":17}],57:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    isString = require('../lang/isString'),
    keysIn = require('../object/keysIn'),
    support = require('../support');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = length && isLength(length) &&
    (isArray(object) || (support.nonEnumStrings && isString(object)) ||
      (support.nonEnumArgs && isArguments(object)));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = shimKeys;

},{"../lang/isArguments":60,"../lang/isArray":61,"../lang/isString":65,"../object/keysIn":71,"../support":74,"./isIndex":49,"./isLength":52}],58:[function(require,module,exports){
var isObject = require('../lang/isObject'),
    isString = require('../lang/isString'),
    support = require('../support');

/**
 * Converts `value` to an object if it is not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  if (support.unindexedChars && isString(value)) {
    var index = -1,
        length = value.length,
        result = Object(value);

    while (++index < length) {
      result[index] = value.charAt(index);
    }
    return result;
  }
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"../lang/isObject":64,"../lang/isString":65,"../support":74}],59:[function(require,module,exports){
var baseToString = require('./baseToString'),
    isArray = require('../lang/isArray');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `value` to property path array if it is not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Array} Returns the property path array.
 */
function toPath(value) {
  if (isArray(value)) {
    return value;
  }
  var result = [];
  baseToString(value).replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
}

module.exports = toPath;

},{"../lang/isArray":61,"./baseToString":31}],60:[function(require,module,exports){
var isArrayLike = require('../internal/isArrayLike'),
    isObjectLike = require('../internal/isObjectLike'),
    support = require('../support');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) && objToString.call(value) == argsTag;
}
// Fallback for environments without a `toStringTag` for `arguments` objects.
if (!support.argsTag) {
  isArguments = function(value) {
    return isObjectLike(value) && isArrayLike(value) &&
      hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
  };
}

module.exports = isArguments;

},{"../internal/isArrayLike":47,"../internal/isObjectLike":53,"../support":74}],61:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isNative = require('./isNative'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray;

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

},{"../internal/isLength":52,"../internal/isObjectLike":53,"./isNative":63}],62:[function(require,module,exports){
(function (global){
var baseIsFunction = require('../internal/baseIsFunction'),
    isNative = require('./isNative');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Native method references. */
var Uint8Array = isNative(Uint8Array = global.Uint8Array) && Uint8Array;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
var isFunction = !(baseIsFunction(/x/) || (Uint8Array && !baseIsFunction(Uint8Array))) ? baseIsFunction : function(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return objToString.call(value) == funcTag;
};

module.exports = isFunction;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../internal/baseIsFunction":23,"./isNative":63}],63:[function(require,module,exports){
var escapeRegExp = require('../string/escapeRegExp'),
    isHostObject = require('../internal/isHostObject'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  escapeRegExp(objToString)
  .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (objToString.call(value) == funcTag) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && (isHostObject(value) ? reIsNative : reIsHostCtor).test(value);
}

module.exports = isNative;

},{"../internal/isHostObject":48,"../internal/isObjectLike":53,"../string/escapeRegExp":73}],64:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return type == 'function' || (!!value && type == 'object');
}

module.exports = isObject;

},{}],65:[function(require,module,exports){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{"../internal/isObjectLike":53}],66:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dateTag] = typedArrayTags[errorTag] =
typedArrayTags[funcTag] = typedArrayTags[mapTag] =
typedArrayTags[numberTag] = typedArrayTags[objectTag] =
typedArrayTags[regexpTag] = typedArrayTags[setTag] =
typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
function isTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
}

module.exports = isTypedArray;

},{"../internal/isLength":52,"../internal/isObjectLike":53}],67:[function(require,module,exports){
var assignWith = require('../internal/assignWith'),
    baseAssign = require('../internal/baseAssign'),
    createAssigner = require('../internal/createAssigner');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"../internal/assignWith":9,"../internal/baseAssign":10,"../internal/createAssigner":35}],68:[function(require,module,exports){
module.exports = require('./assign');

},{"./assign":67}],69:[function(require,module,exports){
var baseFor = require('../internal/baseFor'),
    createForIn = require('../internal/createForIn');

/**
 * Iterates over own and inherited enumerable properties of an object invoking
 * `iteratee` for each property. The `iteratee` is bound to `thisArg` and invoked
 * with three arguments: (value, key, object). Iteratee functions may exit
 * iteration early by explicitly returning `false`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.forIn(new Foo, function(value, key) {
 *   console.log(key);
 * });
 * // => logs 'a', 'b', and 'c' (iteration order is not guaranteed)
 */
var forIn = createForIn(baseFor);

module.exports = forIn;

},{"../internal/baseFor":16,"../internal/createForIn":40}],70:[function(require,module,exports){
var isArrayLike = require('../internal/isArrayLike'),
    isNative = require('../lang/isNative'),
    isObject = require('../lang/isObject'),
    shimKeys = require('../internal/shimKeys'),
    support = require('../support');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object != null && object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object == 'function' ? support.enumPrototypes : isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

module.exports = keys;

},{"../internal/isArrayLike":47,"../internal/shimKeys":57,"../lang/isNative":63,"../lang/isObject":64,"../support":74}],71:[function(require,module,exports){
var arrayEach = require('../internal/arrayEach'),
    isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isFunction = require('../lang/isFunction'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject'),
    isString = require('../lang/isString'),
    support = require('../support');

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/** Used to fix the JScript `[[DontEnum]]` bug. */
var shadowProps = [
  'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'toLocaleString', 'toString', 'valueOf'
];

/** Used for native method references. */
var errorProto = Error.prototype,
    objectProto = Object.prototype,
    stringProto = String.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to avoid iterating over non-enumerable properties in IE < 9. */
var nonEnumProps = {};
nonEnumProps[arrayTag] = nonEnumProps[dateTag] = nonEnumProps[numberTag] = { 'constructor': true, 'toLocaleString': true, 'toString': true, 'valueOf': true };
nonEnumProps[boolTag] = nonEnumProps[stringTag] = { 'constructor': true, 'toString': true, 'valueOf': true };
nonEnumProps[errorTag] = nonEnumProps[funcTag] = nonEnumProps[regexpTag] = { 'constructor': true, 'toString': true };
nonEnumProps[objectTag] = { 'constructor': true };

arrayEach(shadowProps, function(key) {
  for (var tag in nonEnumProps) {
    if (hasOwnProperty.call(nonEnumProps, tag)) {
      var props = nonEnumProps[tag];
      props[key] = hasOwnProperty.call(props, key);
    }
  }
});

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;

  length = (length && isLength(length) &&
    (isArray(object) || (support.nonEnumStrings && isString(object)) ||
      (support.nonEnumArgs && isArguments(object))) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      proto = (isFunction(Ctor) && Ctor.prototype) || objectProto,
      isProto = proto === object,
      result = Array(length),
      skipIndexes = length > 0,
      skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error),
      skipProto = support.enumPrototypes && isFunction(object);

  while (++index < length) {
    result[index] = (index + '');
  }
  // lodash skips the `constructor` property when it infers it is iterating
  // over a `prototype` object because IE < 9 can't set the `[[Enumerable]]`
  // attribute of an existing property and the `constructor` property of a
  // prototype defaults to non-enumerable.
  for (var key in object) {
    if (!(skipProto && key == 'prototype') &&
        !(skipErrorProps && (key == 'message' || key == 'name')) &&
        !(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  if (support.nonEnumShadows && object !== objectProto) {
    var tag = object === stringProto ? stringTag : (object === errorProto ? errorTag : objToString.call(object)),
        nonEnums = nonEnumProps[tag] || nonEnumProps[objectTag];

    if (tag == objectTag) {
      proto = objectProto;
    }
    length = shadowProps.length;
    while (length--) {
      key = shadowProps[length];
      var nonEnum = nonEnums[key];
      if (!(isProto && nonEnum) &&
          (nonEnum ? hasOwnProperty.call(object, key) : object[key] !== proto[key])) {
        result.push(key);
      }
    }
  }
  return result;
}

module.exports = keysIn;

},{"../internal/arrayEach":7,"../internal/isIndex":49,"../internal/isLength":52,"../lang/isArguments":60,"../lang/isArray":61,"../lang/isFunction":62,"../lang/isObject":64,"../lang/isString":65,"../support":74}],72:[function(require,module,exports){
var arrayMap = require('../internal/arrayMap'),
    baseDifference = require('../internal/baseDifference'),
    baseFlatten = require('../internal/baseFlatten'),
    bindCallback = require('../internal/bindCallback'),
    keysIn = require('./keysIn'),
    pickByArray = require('../internal/pickByArray'),
    pickByCallback = require('../internal/pickByCallback'),
    restParam = require('../function/restParam');

/**
 * The opposite of `_.pick`; this method creates an object composed of the
 * own and inherited enumerable properties of `object` that are not omitted.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {Function|...(string|string[])} [predicate] The function invoked per
 *  iteration or property names to omit, specified as individual property
 *  names or arrays of property names.
 * @param {*} [thisArg] The `this` binding of `predicate`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'user': 'fred', 'age': 40 };
 *
 * _.omit(object, 'age');
 * // => { 'user': 'fred' }
 *
 * _.omit(object, _.isNumber);
 * // => { 'user': 'fred' }
 */
var omit = restParam(function(object, props) {
  if (object == null) {
    return {};
  }
  if (typeof props[0] != 'function') {
    var props = arrayMap(baseFlatten(props), String);
    return pickByArray(object, baseDifference(keysIn(object), props));
  }
  var predicate = bindCallback(props[0], props[1], 3);
  return pickByCallback(object, function(value, key, object) {
    return !predicate(value, key, object);
  });
});

module.exports = omit;

},{"../function/restParam":5,"../internal/arrayMap":8,"../internal/baseDifference":13,"../internal/baseFlatten":15,"../internal/bindCallback":32,"../internal/pickByArray":55,"../internal/pickByCallback":56,"./keysIn":71}],73:[function(require,module,exports){
var baseToString = require('../internal/baseToString');

/**
 * Used to match `RegExp` [special characters](http://www.regular-expressions.info/characters.html#special).
 * In addition to special characters the forward slash is escaped to allow for
 * easier `eval` use and `Function` compilation.
 */
var reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
    reHasRegExpChars = RegExp(reRegExpChars.source);

/**
 * Escapes the `RegExp` special characters "\", "/", "^", "$", ".", "|", "?",
 * "*", "+", "(", ")", "[", "]", "{" and "}" in `string`.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escapeRegExp('[lodash](https://lodash.com/)');
 * // => '\[lodash\]\(https:\/\/lodash\.com\/\)'
 */
function escapeRegExp(string) {
  string = baseToString(string);
  return (string && reHasRegExpChars.test(string))
    ? string.replace(reRegExpChars, '\\$&')
    : string;
}

module.exports = escapeRegExp;

},{"../internal/baseToString":31}],74:[function(require,module,exports){
(function (global){
/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    objectTag = '[object Object]';

/** Used for native method references. */
var arrayProto = Array.prototype,
    errorProto = Error.prototype,
    objectProto = Object.prototype;

/** Used to detect DOM support. */
var document = (document = global.window) && document.document;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice;

/**
 * An object environment feature flags.
 *
 * @static
 * @memberOf _
 * @type Object
 */
var support = {};

(function(x) {
  var Ctor = function() { this.x = x; },
      args = arguments,
      object = { '0': x, 'length': x },
      props = [];

  Ctor.prototype = { 'valueOf': x, 'y': x };
  for (var key in new Ctor) { props.push(key); }

  /**
   * Detect if the `toStringTag` of `arguments` objects is resolvable
   * (all but Firefox < 4, IE < 9).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.argsTag = objToString.call(args) == argsTag;

  /**
   * Detect if `name` or `message` properties of `Error.prototype` are
   * enumerable by default (IE < 9, Safari < 5.1).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') ||
    propertyIsEnumerable.call(errorProto, 'name');

  /**
   * Detect if `prototype` properties are enumerable by default.
   *
   * Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
   * (if the prototype or a property on the prototype has been set)
   * incorrectly set the `[[Enumerable]]` value of a function's `prototype`
   * property to `true`.
   *
   * @memberOf _.support
   * @type boolean
   */
  support.enumPrototypes = propertyIsEnumerable.call(Ctor, 'prototype');

  /**
   * Detect if functions can be decompiled by `Function#toString`
   * (all but Firefox OS certified apps, older Opera mobile browsers, and
   * the PlayStation 3; forced `false` for Windows 8 apps).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.funcDecomp = /\bthis\b/.test(function() { return this; });

  /**
   * Detect if `Function#name` is supported (all but IE).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.funcNames = typeof Function.name == 'string';

  /**
   * Detect if the `toStringTag` of DOM nodes is resolvable (all but IE < 9).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.nodeTag = objToString.call(document) != objectTag;

  /**
   * Detect if string indexes are non-enumerable (IE < 9, RingoJS, Rhino, Narwhal).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.nonEnumStrings = !propertyIsEnumerable.call('x', 0);

  /**
   * Detect if properties shadowing those on `Object.prototype` are non-enumerable.
   *
   * In IE < 9 an object's own properties, shadowing non-enumerable ones,
   * are made non-enumerable as well (a.k.a the JScript `[[DontEnum]]` bug).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.nonEnumShadows = !/valueOf/.test(props);

  /**
   * Detect if own properties are iterated after inherited properties (IE < 9).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.ownLast = props[0] != 'x';

  /**
   * Detect if `Array#shift` and `Array#splice` augment array-like objects
   * correctly.
   *
   * Firefox < 10, compatibility modes of IE 8, and IE < 9 have buggy Array
   * `shift()` and `splice()` functions that fail to remove the last element,
   * `value[0]`, of array-like objects even though the "length" property is
   * set to `0`. The `shift()` method is buggy in compatibility modes of IE 8,
   * while `splice()` is buggy regardless of mode in IE < 9.
   *
   * @memberOf _.support
   * @type boolean
   */
  support.spliceObjects = (splice.call(object, 0, 1), !object[0]);

  /**
   * Detect lack of support for accessing string characters by index.
   *
   * IE < 8 can't access characters by index. IE 8 can only access characters
   * by index on string literals, not string objects.
   *
   * @memberOf _.support
   * @type boolean
   */
  support.unindexedChars = ('x'[0] + Object('x')[0]) != 'xx';

  /**
   * Detect if the DOM is supported.
   *
   * @memberOf _.support
   * @type boolean
   */
  try {
    support.dom = document.createDocumentFragment().nodeType === 11;
  } catch(e) {
    support.dom = false;
  }

  /**
   * Detect if `arguments` object indexes are non-enumerable.
   *
   * In Firefox < 4, IE < 9, PhantomJS, and Safari < 5.1 `arguments` object
   * indexes are non-enumerable. Chrome < 25 and Node.js < 0.11.0 treat
   * `arguments` object indexes as non-enumerable and fail `hasOwnProperty`
   * checks for indexes that exceed the number of function parameters and
   * whose associated argument values are `0`.
   *
   * @memberOf _.support
   * @type boolean
   */
  try {
    support.nonEnumArgs = !propertyIsEnumerable.call(args, 1);
  } catch(e) {
    support.nonEnumArgs = true;
  }
}(1, 0));

module.exports = support;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],75:[function(require,module,exports){
/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var object = { 'user': 'fred' };
 * var getter = _.constant(object);
 *
 * getter() === object;
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;

},{}],76:[function(require,module,exports){
/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],77:[function(require,module,exports){
var baseProperty = require('../internal/baseProperty'),
    basePropertyDeep = require('../internal/basePropertyDeep'),
    isKey = require('../internal/isKey');

/**
 * Creates a function which returns the property value at `path` on a
 * given object.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': { 'c': 2 } } },
 *   { 'a': { 'b': { 'c': 1 } } }
 * ];
 *
 * _.map(objects, _.property('a.b.c'));
 * // => [2, 1]
 *
 * _.pluck(_.sortBy(objects, _.property(['a', 'b', 'c'])), 'a.b.c');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(path) : basePropertyDeep(path);
}

module.exports = property;

},{"../internal/baseProperty":28,"../internal/basePropertyDeep":29,"../internal/isKey":51}],78:[function(require,module,exports){
module.exports = require('./lib/query-selector');
},{"./lib/query-selector":79}],79:[function(require,module,exports){
/**
 * @ignore
 * css3 selector engine for ie6-8
 * @author yiminghe@gmail.com
 */

var util = require('./query-selector/util');
var parser = require('./query-selector/parser');

var EXPANDO_SELECTOR_KEY = '_ks_data_selector_id_',
  caches = {},
  isContextXML,
  uuid = 0,
  subMatchesCache = {},
  getAttr = function (el, name) {
    if (isContextXML) {
      return util.getSimpleAttr(el, name);
    } else {
      return util.attr(el, name);
    }
  },
  hasSingleClass = util.hasSingleClass,
  isTag = util.isTag,
  aNPlusB = /^(([+-]?(?:\d+)?)?n)?([+-]?\d+)?$/;

// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
var unescape = /\\([\da-fA-F]{1,6}[\x20\t\r\n\f]?|.)/g,
  unescapeFn = function (_, escaped) {
    var high = '0x' + escaped - 0x10000;
    // NaN means non-codepoint
    return isNaN(high) ?
      escaped :
      // BMP codepoint
      high < 0 ?
        String.fromCharCode(high + 0x10000) :
        // Supplemental Plane codepoint (surrogate pair)
        String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
  };

var matchExpr;

var pseudoFnExpr = {
  'nth-child': function (el, param) {
    var ab = getAb(param),
      a = ab.a,
      b = ab.b;
    if (a === 0 && b === 0) {
      return 0;
    }
    var index = 0,
      parent = el.parentNode;
    if (parent) {
      var childNodes = parent.childNodes,
        count = 0,
        child,
        ret,
        len = childNodes.length;
      for (; count < len; count++) {
        child = childNodes[count];
        if (child.nodeType === 1) {
          index++;
          ret = matchIndexByAb(index, a, b, child === el);
          if (ret !== undefined) {
            return ret;
          }
        }
      }
    }
    return 0;
  },
  'nth-last-child': function (el, param) {
    var ab = getAb(param),
      a = ab.a,
      b = ab.b;
    if (a === 0 && b === 0) {
      return 0;
    }
    var index = 0,
      parent = el.parentNode;
    if (parent) {
      var childNodes = parent.childNodes,
        len = childNodes.length,
        count = len - 1,
        child,
        ret;
      for (; count >= 0; count--) {
        child = childNodes[count];
        if (child.nodeType === 1) {
          index++;
          ret = matchIndexByAb(index, a, b, child === el);
          if (ret !== undefined) {
            return ret;
          }
        }
      }
    }
    return 0;
  },
  'nth-of-type': function (el, param) {
    var ab = getAb(param),
      a = ab.a,
      b = ab.b;
    if (a === 0 && b === 0) {
      return 0;
    }
    var index = 0,
      parent = el.parentNode;
    if (parent) {
      var childNodes = parent.childNodes,
        elType = el.tagName,
        count = 0,
        child,
        ret,
        len = childNodes.length;
      for (; count < len; count++) {
        child = childNodes[count];
        if (child.tagName === elType) {
          index++;
          ret = matchIndexByAb(index, a, b, child === el);
          if (ret !== undefined) {
            return ret;
          }
        }
      }
    }
    return 0;
  },
  'nth-last-of-type': function (el, param) {
    var ab = getAb(param),
      a = ab.a,
      b = ab.b;
    if (a === 0 && b === 0) {
      return 0;
    }
    var index = 0,
      parent = el.parentNode;
    if (parent) {
      var childNodes = parent.childNodes,
        len = childNodes.length,
        elType = el.tagName,
        count = len - 1,
        child,
        ret;
      for (; count >= 0; count--) {
        child = childNodes[count];
        if (child.tagName === elType) {
          index++;
          ret = matchIndexByAb(index, a, b, child === el);
          if (ret !== undefined) {
            return ret;
          }
        }
      }
    }
    return 0;
  },
  lang: function (el, lang) {
    var elLang;
    lang = unEscape(lang.toLowerCase());
    do {
      if ((elLang = (isContextXML ?
        el.getAttribute('xml:lang') || el.getAttribute('lang') :
          el.lang))) {
        elLang = elLang.toLowerCase();
        return elLang === lang || elLang.indexOf(lang + '-') === 0;
      }
    } while ((el = el.parentNode) && el.nodeType === 1);
    return false;
  },
  not: function (el, negationArg) {
    return !matchExpr[negationArg.t](el, negationArg.value);
  }
};

var pseudoIdentExpr = {
  empty: function (el) {
    var childNodes = el.childNodes,
      index = 0,
      len = childNodes.length - 1,
      child,
      nodeType;
    for (; index < len; index++) {
      child = childNodes[index];
      nodeType = child.nodeType;
      // only element nodes and content nodes
      // (such as Dom [Dom-LEVEL-3-CORE] text nodes,
      // CDATA nodes, and entity references
      if (nodeType === 1 || nodeType === 3 || nodeType === 4 || nodeType === 5) {
        return 0;
      }
    }
    return 1;
  },
  root: function (el) {
    if (el.nodeType === 9) {
      return true;
    }
    return el.ownerDocument &&
      el === el.ownerDocument.documentElement;
  },
  'first-child': function (el) {
    return pseudoFnExpr['nth-child'](el, 1);
  },
  'last-child': function (el) {
    return pseudoFnExpr['nth-last-child'](el, 1);
  },
  'first-of-type': function (el) {
    return pseudoFnExpr['nth-of-type'](el, 1);
  },
  'last-of-type': function (el) {
    return pseudoFnExpr['nth-last-of-type'](el, 1);
  },
  'only-child': function (el) {
    return pseudoIdentExpr['first-child'](el) &&
      pseudoIdentExpr['last-child'](el);
  },
  'only-of-type': function (el) {
    return pseudoIdentExpr['first-of-type'](el) &&
      pseudoIdentExpr['last-of-type'](el);
  },
  focus: function (el) {
    var doc = el.ownerDocument;
    return doc && el === doc.activeElement &&
      (!doc.hasFocus || doc.hasFocus()) && !!(el.type || el.href || el.tabIndex >= 0);
  },
  target: function (el) {
    var hash = location.hash;
    return hash && hash.slice(1) === getAttr(el, 'id');
  },
  enabled: function (el) {
    return !el.disabled;
  },
  disabled: function (el) {
    return el.disabled;
  },
  checked: function (el) {
    var nodeName = el.nodeName.toLowerCase();
    return (nodeName === 'input' && el.checked) ||
      (nodeName === 'option' && el.selected);
  }
};

var attributeExpr = {
  '~=': function (elValue, value) {
    if (!value || value.indexOf(' ') > -1) {
      return 0;
    }
    return (' ' + elValue + ' ').indexOf(' ' + value + ' ') !== -1;
  },
  '|=': function (elValue, value) {
    return (' ' + elValue).indexOf(' ' + value + '-') !== -1;
  },
  '^=': function (elValue, value) {
    return value && util.startsWith(elValue, value);
  },
  '$=': function (elValue, value) {
    return value && util.endsWith(elValue, value);
  },
  '*=': function (elValue, value) {
    return value && elValue.indexOf(value) !== -1;
  },
  '=': function (elValue, value) {
    return elValue === value;
  }
};

var relativeExpr = {
  '>': {
    dir: 'parentNode',
    immediate: 1
  },
  ' ': {
    dir: 'parentNode'
  },
  '+': {
    dir: 'previousSibling',
    immediate: 1
  },
  '~': {
    dir: 'previousSibling'
  }
};

matchExpr = {
  tag: isTag,
  cls: hasSingleClass,
  id: function (el, value) {
    return getAttr(el, 'id') === value;
  },
  attrib: function (el, value) {
    var name = value.ident;
    if (!isContextXML) {
      name = name.toLowerCase();
    }
    var elValue = getAttr(el, name);
    var match = value.match;
    if (!match && elValue !== undefined) {
      return 1;
    } else if (match) {
      if (elValue === undefined) {
        return 0;
      }
      var matchFn = attributeExpr[match];
      if (matchFn) {
        return matchFn(elValue + '', value.value + '');
      }
    }
    return 0;
  },
  pseudo: function (el, value) {
    var fn, fnStr, ident;
    if ((fnStr = value.fn)) {
      if (!(fn = pseudoFnExpr[fnStr])) {
        throw new SyntaxError('Syntax error: not support pseudo: ' + fnStr);
      }
      return fn(el, value.param);
    }
    if ((ident = value.ident)) {
      if (!pseudoIdentExpr[ident]) {
        throw new SyntaxError('Syntax error: not support pseudo: ' + ident);
      }
      return pseudoIdentExpr[ident](el);
    }
    return 0;
  }
};

function unEscape(str) {
  return str.replace(unescape, unescapeFn);
}

parser.lexer.yy = {
  trim: util.trim,
  unEscape: unEscape,
  unEscapeStr: function (str) {
    return this.unEscape(str.slice(1, -1));
  }
};

function resetStatus() {
  subMatchesCache = {};
}

function dir(el, direction) {
  do {
    el = el[direction];
  } while (el && el.nodeType !== 1);
  return el;
}

function getAb(param) {
  var a = 0,
    match,
    b = 0;
  if (typeof param === 'number') {
    b = param;
  } else if (param === 'odd') {
    a = 2;
    b = 1;
  } else if (param === 'even') {
    a = 2;
    b = 0;
  } else if ((match = param.replace(/\s/g, '').match(aNPlusB))) {
    if (match[1]) {
      a = parseInt(match[2], 10);
      if (isNaN(a)) {
        if (match[2] === '-') {
          a = -1;
        } else {
          a = 1;
        }
      }
    } else {
      a = 0;
    }
    b = parseInt(match[3], 10) || 0;
  }
  return {
    a: a,
    b: b
  };
}

function matchIndexByAb(index, a, b, eq) {
  if (a === 0) {
    if (index === b) {
      return eq;
    }
  } else {
    if ((index - b) / a >= 0 && (index - b) % a === 0 && eq) {
      return 1;
    }
  }
  return undefined;
}

function isXML(elem) {
  var documentElement = elem && (elem.ownerDocument || elem).documentElement;
  return documentElement ? documentElement.nodeName.toLowerCase() !== 'html' : false;
}

function matches(str, seeds) {
  return select(str, null, seeds);
}

function singleMatch(el, match) {
  if (!match) {
    return true;
  }
  if (!el) {
    return false;
  }

  if (el.nodeType === 9) {
    return false;
  }

  var matched = 1,
    matchSuffix = match.suffix,
    matchSuffixLen,
    matchSuffixIndex;

  if (match.t === 'tag') {
    matched &= matchExpr.tag(el, match.value);
  }

  if (matched && matchSuffix) {
    matchSuffixLen = matchSuffix.length;
    matchSuffixIndex = 0;
    for (; matched && matchSuffixIndex < matchSuffixLen; matchSuffixIndex++) {
      var singleMatchSuffix = matchSuffix[matchSuffixIndex],
        singleMatchSuffixType = singleMatchSuffix.t;
      if (matchExpr[singleMatchSuffixType]) {
        matched &= matchExpr[singleMatchSuffixType](el, singleMatchSuffix.value);
      }
    }
  }

  return matched;
}

// match by adjacent immediate single selector match
function matchImmediate(el, match) {
  var matched = 1,
    startEl = el,
    relativeOp,
    startMatch = match;

  do {
    matched &= singleMatch(el, match);
    if (matched) {
      // advance
      match = match && match.prev;
      if (!match) {
        return true;
      }
      relativeOp = relativeExpr[match.nextCombinator];
      el = dir(el, relativeOp.dir);
      if (!relativeOp.immediate) {
        return {
          // advance for non-immediate
          el: el,
          match: match
        };
      }
    } else {
      relativeOp = relativeExpr[match.nextCombinator];
      if (relativeOp.immediate) {
        // retreat but advance startEl
        return {
          el: dir(startEl, relativeExpr[startMatch.nextCombinator].dir),
          match: startMatch
        };
      } else {
        // advance (before immediate match + jump unmatched)
        return {
          el: el && dir(el, relativeOp.dir),
          match: match
        };
      }
    }
  } while (el);

  // only occur when match immediate
  return {
    el: dir(startEl, relativeExpr[startMatch.nextCombinator].dir),
    match: startMatch
  };
}

// find fixed part, fixed with seeds
function findFixedMatchFromHead(el, head) {
  var relativeOp,
    cur = head;

  do {
    if (!singleMatch(el, cur)) {
      return null;
    }
    cur = cur.prev;
    if (!cur) {
      return true;
    }
    relativeOp = relativeExpr[cur.nextCombinator];
    el = dir(el, relativeOp.dir);
  } while (el && relativeOp.immediate);
  if (!el) {
    return null;
  }
  return {
    el: el,
    match: cur
  };
}

function genId(el) {
  var selectorId;

  if (isContextXML) {
    if (!(selectorId = el.getAttribute(EXPANDO_SELECTOR_KEY))) {
      el.setAttribute(EXPANDO_SELECTOR_KEY, selectorId = (+new Date() + '_' + (++uuid)));
    }
  } else {
    if (!(selectorId = el[EXPANDO_SELECTOR_KEY])) {
      selectorId = el[EXPANDO_SELECTOR_KEY] = (+new Date()) + '_' + (++uuid);
    }
  }

  return selectorId;
}

function matchSub(el, match) {
  var selectorId = genId(el),
    matchKey;
  matchKey = selectorId + '_' + (match.order || 0);
  if (matchKey in subMatchesCache) {
    return subMatchesCache[matchKey];
  }
  subMatchesCache[matchKey] = matchSubInternal(el, match);
  return subMatchesCache[matchKey];
}

// recursive match by sub selector string from right to left
// grouped by immediate selectors
function matchSubInternal(el, match) {
  var matchImmediateRet = matchImmediate(el, match);
  if (matchImmediateRet === true) {
    return true;
  } else {
    el = matchImmediateRet.el;
    match = matchImmediateRet.match;
    while (el) {
      if (matchSub(el, match)) {
        return true;
      }
      el = dir(el, relativeExpr[match.nextCombinator].dir);
    }
    return false;
  }
}

function select(str, context, seeds) {
  if (!caches[str]) {
    caches[str] = parser.parse(str);
  }

  var selector = caches[str],
    groupIndex = 0,
    groupLen = selector.length,
    contextDocument,
    group,
    ret = [];

  if (seeds) {
    context = context || seeds[0].ownerDocument;
  }

  contextDocument = context && context.ownerDocument || typeof document !== 'undefined' && document;

  if (context && context.nodeType === 9 && !contextDocument) {
    contextDocument = context;
  }

  context = context || contextDocument;

  isContextXML = isXML(context);

  for (; groupIndex < groupLen; groupIndex++) {
    resetStatus();

    group = selector[groupIndex];

    var suffix = group.suffix,
      suffixIndex,
      suffixLen,
      seedsIndex,
      mySeeds = seeds,
      seedsLen,
      id = null;

    if (!mySeeds) {
      if (suffix && !isContextXML) {
        suffixIndex = 0;
        suffixLen = suffix.length;
        for (; suffixIndex < suffixLen; suffixIndex++) {
          var singleSuffix = suffix[suffixIndex];
          if (singleSuffix.t === 'id') {
            id = singleSuffix.value;
            break;
          }
        }
      }

      if (id) {
        // http://yiminghe.github.io/lab/playground/fragment-selector/selector.html
        var doesNotHasById = !context.getElementById,
          contextInDom = util.contains(contextDocument, context),
          tmp = doesNotHasById ? (
            contextInDom ?
              contextDocument.getElementById(id) :
              null
          ) : context.getElementById(id);
        // id bug
        // https://github.com/kissyteam/kissy/issues/67
        if (!tmp && doesNotHasById || tmp && getAttr(tmp, 'id') !== id) {
          var tmps = util.getElementsByTagName('*', context),
            tmpLen = tmps.length,
            tmpI = 0;
          for (; tmpI < tmpLen; tmpI++) {
            tmp = tmps[tmpI];
            if (getAttr(tmp, 'id') === id) {
              mySeeds = [tmp];
              break;
            }
          }
          if (tmpI === tmpLen) {
            mySeeds = [];
          }
        } else {
          if (contextInDom && tmp && context !== contextDocument) {
            tmp = util.contains(context, tmp) ? tmp : null;
          }
          mySeeds = tmp ? [tmp] : [];
        }
      } else {
        mySeeds = util.getElementsByTagName(group.value || '*', context);
      }
    }

    seedsIndex = 0;
    seedsLen = mySeeds.length;

    if (!seedsLen) {
      continue;
    }

    for (; seedsIndex < seedsLen; seedsIndex++) {
      var seed = mySeeds[seedsIndex];
      var matchHead = findFixedMatchFromHead(seed, group);
      if (matchHead === true) {
        ret.push(seed);
      } else if (matchHead) {
        if (matchSub(matchHead.el, matchHead.match)) {
          ret.push(seed);
        }
      }
    }
  }

  if (groupLen > 1) {
    ret = util.unique(ret);
  }

  return ret;
}

module.exports = select;

select.parse = function (str) {
  return parser.parse(str);
};

select.matches = matches;

select.util = util;

select.version = '@VERSION@';
/**
 * @ignore
 * note 2013-03-28
 *  - use recursive call to replace backtracking algorithm
 *
 * refer
 *  - http://www.w3.org/TR/selectors/
 *  - http://www.impressivewebs.com/browser-support-css3-selectors/
 *  - http://blogs.msdn.com/ie/archive/2010/05/13/the-css-corner-css3-selectors.aspx
 *  - http://sizzlejs.com/
 */
},{"./query-selector/parser":80,"./query-selector/util":81}],80:[function(require,module,exports){
/*
  Generated by kison.*/
var parser = (function (undefined) {
    /*jshint quotmark:false, loopfunc:true, indent:false, unused:false, asi:true, boss:true*/
    /* Generated by kison */
    var parser = {},
        GrammarConst = {
            'SHIFT_TYPE': 1,
            'REDUCE_TYPE': 2,
            'ACCEPT_TYPE': 0,
            'TYPE_INDEX': 0,
            'PRODUCTION_INDEX': 1,
            'TO_INDEX': 2
        };
    /*jslint quotmark: false*/
    function mix(to, from) {
        for (var f in from) {
            to[f] = from[f];
        }
    }

    function isArray(obj) {
        return '[object Array]' === Object.prototype.toString.call(obj);
    }

    function each(object, fn, context) {
        if (object) {
            var key,
                val,
                length,
                i = 0;

            context = context || null;

            if (!isArray(object)) {
                for (key in object) {
                    // can not use hasOwnProperty
                    if (fn.call(context, object[key], key, object) === false) {
                        break;
                    }
                }
            } else {
                length = object.length;
                for (val = object[0]; i < length; val = object[++i]) {
                    if (fn.call(context, val, i, object) === false) {
                        break;
                    }
                }
            }
        }
    }

    function inArray(item, arr) {
        for (var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] === item) {
                return true;
            }
        }
        return false;
    }
    var Lexer = function Lexer(cfg) {

        var self = this;

        /*
     lex rules.
     @type {Object[]}
     @example
     [
     {
     regexp:'\\w+',
     state:['xx'],
     token:'c',
     // this => lex
     action:function(){}
     }
     ]
     */
        self.rules = [];

        mix(self, cfg);

        /*
     Input languages
     @type {String}
     */

        self.resetInput(self.input);
    };
    Lexer.prototype = {
        'resetInput': function (input) {
            mix(this, {
                input: input,
                matched: '',
                stateStack: [Lexer.STATIC.INITIAL],
                match: '',
                text: '',
                firstLine: 1,
                lineNumber: 1,
                lastLine: 1,
                firstColumn: 1,
                lastColumn: 1
            });
        },
        'getCurrentRules': function () {
            var self = this,
                currentState = self.stateStack[self.stateStack.length - 1],
                rules = [];
            //#JSCOVERAGE_IF
            if (self.mapState) {
                currentState = self.mapState(currentState);
            }
            each(self.rules, function (r) {
                var state = r.state || r[3];
                if (!state) {
                    if (currentState === Lexer.STATIC.INITIAL) {
                        rules.push(r);
                    }
                } else if (inArray(currentState, state)) {
                    rules.push(r);
                }
            });
            return rules;
        },
        'pushState': function (state) {
            this.stateStack.push(state);
        },
        'popState': function (num) {
            num = num || 1;
            var ret;
            while (num--) {
                ret = this.stateStack.pop();
            }
            return ret;
        },
        'showDebugInfo': function () {
            var self = this,
                DEBUG_CONTEXT_LIMIT = Lexer.STATIC.DEBUG_CONTEXT_LIMIT,
                matched = self.matched,
                match = self.match,
                input = self.input;
            matched = matched.slice(0, matched.length - match.length);
            //#JSCOVERAGE_IF 0
            var past = (matched.length > DEBUG_CONTEXT_LIMIT ? '...' : '') +
                matched.slice(0 - DEBUG_CONTEXT_LIMIT).replace(/\n/, ' '),
                next = match + input;
            //#JSCOVERAGE_ENDIF
            next = next.slice(0, DEBUG_CONTEXT_LIMIT) +
                (next.length > DEBUG_CONTEXT_LIMIT ? '...' : '');
            return past + next + '\n' + new Array(past.length + 1).join('-') + '^';
        },
        'mapSymbol': function mapSymbolForCodeGen(t) {
            return this.symbolMap[t];
        },
        'mapReverseSymbol': function (rs) {
            var self = this,
                symbolMap = self.symbolMap,
                i,
                reverseSymbolMap = self.reverseSymbolMap;
            if (!reverseSymbolMap && symbolMap) {
                reverseSymbolMap = self.reverseSymbolMap = {};
                for (i in symbolMap) {
                    reverseSymbolMap[symbolMap[i]] = i;
                }
            }
            //#JSCOVERAGE_IF
            if (reverseSymbolMap) {
                return reverseSymbolMap[rs];
            } else {
                return rs;
            }
        },
        'lex': function () {
            var self = this,
                input = self.input,
                i,
                rule,
                m,
                ret,
                lines,
                rules = self.getCurrentRules();

            self.match = self.text = '';

            if (!input) {
                return self.mapSymbol(Lexer.STATIC.END_TAG);
            }

            for (i = 0; i < rules.length; i++) {
                rule = rules[i];
                //#JSCOVERAGE_IF 0
                var regexp = rule.regexp || rule[1],
                    token = rule.token || rule[0],
                    action = rule.action || rule[2] || undefined;
                //#JSCOVERAGE_ENDIF
                if ((m = input.match(regexp))) {
                    lines = m[0].match(/\n.*/g);
                    if (lines) {
                        self.lineNumber += lines.length;
                    }
                    mix(self, {
                        firstLine: self.lastLine,
                        lastLine: self.lineNumber + 1,
                        firstColumn: self.lastColumn,
                        lastColumn: lines ?
                            lines[lines.length - 1].length - 1 : self.lastColumn + m[0].length
                    });
                    var match;
                    // for error report
                    match = self.match = m[0];

                    // all matches
                    self.matches = m;
                    // may change by user
                    self.text = match;
                    // matched content utils now
                    self.matched += match;
                    ret = action && action.call(self);
                    if (ret === undefined) {
                        ret = token;
                    } else {
                        ret = self.mapSymbol(ret);
                    }
                    input = input.slice(match.length);
                    self.input = input;

                    if (ret) {
                        return ret;
                    } else {
                        // ignore
                        return self.lex();
                    }
                }
            }
        }
    };
    Lexer.STATIC = {
        'INITIAL': 'I',
        'DEBUG_CONTEXT_LIMIT': 20,
        'END_TAG': '$EOF'
    };
    var lexer = new Lexer({
        'rules': [
            ['b', /^\[(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['c', /^(?:[\t\r\n\f\x20]*)\]/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['d', /^(?:[\t\r\n\f\x20]*)~=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['e', /^(?:[\t\r\n\f\x20]*)\|=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['f', /^(?:[\t\r\n\f\x20]*)\^=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['g', /^(?:[\t\r\n\f\x20]*)\$=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['h', /^(?:[\t\r\n\f\x20]*)\*=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['i', /^(?:[\t\r\n\f\x20]*)\=(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['j', /^(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)\(/,
                function () {
                    this.text = this.yy.trim(this.text).slice(0, -1);
                    this.pushState('fn');
                }
            ],
            ['k', /^[^\)]*/,
                function () {
                    this.popState();
                },
                ['fn']
            ],
            ['l', /^(?:[\t\r\n\f\x20]*)\)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['m', /^:not\((?:[\t\r\n\f\x20]*)/i,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['n', /^(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)/,
                function () {
                    this.text = this.yy.unEscape(this.text);
                }
            ],
            ['o', /^"(\\"|[^"])*"/,
                function () {
                    this.text = this.yy.unEscapeStr(this.text);
                }
            ],
            ['o', /^'(\\'|[^'])*'/,
                function () {
                    this.text = this.yy.unEscapeStr(this.text);
                }
            ],
            ['p', /^#(?:(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))+)/,
                function () {
                    this.text = this.yy.unEscape(this.text.slice(1));
                }
            ],
            ['q', /^\.(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)/,
                function () {
                    this.text = this.yy.unEscape(this.text.slice(1));
                }
            ],
            ['r', /^(?:[\t\r\n\f\x20]*),(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['s', /^::?/, 0],
            ['t', /^(?:[\t\r\n\f\x20]*)\+(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['u', /^(?:[\t\r\n\f\x20]*)>(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['v', /^(?:[\t\r\n\f\x20]*)~(?:[\t\r\n\f\x20]*)/,
                function () {
                    this.text = this.yy.trim(this.text);
                }
            ],
            ['w', /^\*/, 0],
            ['x', /^(?:[\t\r\n\f\x20]+)/, 0],
            ['y', /^./, 0]
        ]
    });
    parser.lexer = lexer;
    lexer.symbolMap = {
        '$EOF': 'a',
        'LEFT_BRACKET': 'b',
        'RIGHT_BRACKET': 'c',
        'INCLUDES': 'd',
        'DASH_MATCH': 'e',
        'PREFIX_MATCH': 'f',
        'SUFFIX_MATCH': 'g',
        'SUBSTRING_MATCH': 'h',
        'ALL_MATCH': 'i',
        'FUNCTION': 'j',
        'PARAMETER': 'k',
        'RIGHT_PARENTHESES': 'l',
        'NOT': 'm',
        'IDENT': 'n',
        'STRING': 'o',
        'HASH': 'p',
        'CLASS': 'q',
        'COMMA': 'r',
        'COLON': 's',
        'PLUS': 't',
        'GREATER': 'u',
        'TILDE': 'v',
        'UNIVERSAL': 'w',
        'S': 'x',
        'INVALID': 'y',
        '$START': 'z',
        'selectors_group': 'aa',
        'selector': 'ab',
        'simple_selector_sequence': 'ac',
        'combinator': 'ad',
        'type_selector': 'ae',
        'id_selector': 'af',
        'class_selector': 'ag',
        'attrib_match': 'ah',
        'attrib': 'ai',
        'attrib_val': 'aj',
        'pseudo': 'ak',
        'negation': 'al',
        'negation_arg': 'am',
        'suffix_selector': 'an',
        'suffix_selectors': 'ao'
    };
    parser.productions = [
        ['z', ['aa']],
        ['aa', ['ab'],
            function () {
                return [this.$1];
            }
        ],
        ['aa', ['aa', 'r', 'ab'],
            function () {
                this.$1.push(this.$3);
            }
        ],
        ['ab', ['ac']],
        ['ab', ['ab', 'ad', 'ac'],
            function () {
                // LinkedList

                this.$1.nextCombinator = this.$3.prevCombinator = this.$2;
                var order;
                order = this.$1.order = this.$1.order || 0;
                this.$3.order = order + 1;
                this.$3.prev = this.$1;
                this.$1.next = this.$3;
                return this.$3;
            }
        ],
        ['ad', ['t']],
        ['ad', ['u']],
        ['ad', ['v']],
        ['ad', ['x'],
            function () {
                return ' ';
            }
        ],
        ['ae', ['n'],
            function () {
                return {
                    t: 'tag',
                    value: this.$1
                };
            }
        ],
        ['ae', ['w'],
            function () {
                return {
                    t: 'tag',
                    value: this.$1
                };
            }
        ],
        ['af', ['p'],
            function () {
                return {
                    t: 'id',
                    value: this.$1
                };
            }
        ],
        ['ag', ['q'],
            function () {
                return {
                    t: 'cls',
                    value: this.$1
                };
            }
        ],
        ['ah', ['f']],
        ['ah', ['g']],
        ['ah', ['h']],
        ['ah', ['i']],
        ['ah', ['d']],
        ['ah', ['e']],
        ['ai', ['b', 'n', 'c'],
            function () {
                return {
                    t: 'attrib',
                    value: {
                        ident: this.$2
                    }
                };
            }
        ],
        ['aj', ['n']],
        ['aj', ['o']],
        ['ai', ['b', 'n', 'ah', 'aj', 'c'],
            function () {
                return {
                    t: 'attrib',
                    value: {
                        ident: this.$2,
                        match: this.$3,
                        value: this.$4
                    }
                };
            }
        ],
        ['ak', ['s', 'j', 'k', 'l'],
            function () {
                return {
                    t: 'pseudo',
                    value: {
                        fn: this.$2.toLowerCase(),
                        param: this.$3
                    }
                };
            }
        ],
        ['ak', ['s', 'n'],
            function () {
                return {
                    t: 'pseudo',
                    value: {
                        ident: this.$2.toLowerCase()
                    }
                };
            }
        ],
        ['al', ['m', 'am', 'l'],
            function () {
                return {
                    t: 'pseudo',
                    value: {
                        fn: 'not',
                        param: this.$2
                    }
                };
            }
        ],
        ['am', ['ae']],
        ['am', ['af']],
        ['am', ['ag']],
        ['am', ['ai']],
        ['am', ['ak']],
        ['an', ['af']],
        ['an', ['ag']],
        ['an', ['ai']],
        ['an', ['ak']],
        ['an', ['al']],
        ['ao', ['an'],
            function () {
                return [this.$1];
            }
        ],
        ['ao', ['ao', 'an'],
            function () {
                this.$1.push(this.$2);
            }
        ],
        ['ac', ['ae']],
        ['ac', ['ao'],
            function () {
                return {
                    suffix: this.$1
                };
            }
        ],
        ['ac', ['ae', 'ao'],
            function () {
                return {
                    t: 'tag',
                    value: this.$1.value,
                    suffix: this.$2
                };
            }
        ]
    ];
    parser.table = {
        'gotos': {
            '0': {
                'aa': 8,
                'ab': 9,
                'ae': 10,
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 16,
                'ao': 17,
                'ac': 18
            },
            '2': {
                'ae': 20,
                'af': 21,
                'ag': 22,
                'ai': 23,
                'ak': 24,
                'am': 25
            },
            '9': {
                'ad': 33
            },
            '10': {
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 16,
                'ao': 34
            },
            '17': {
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 35
            },
            '19': {
                'ah': 43
            },
            '28': {
                'ab': 46,
                'ae': 10,
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 16,
                'ao': 17,
                'ac': 18
            },
            '33': {
                'ae': 10,
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 16,
                'ao': 17,
                'ac': 47
            },
            '34': {
                'af': 11,
                'ag': 12,
                'ai': 13,
                'ak': 14,
                'al': 15,
                'an': 35
            },
            '43': {
                'aj': 50
            },
            '46': {
                'ad': 33
            }
        },
        'action': {
            '0': {
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'n': [1, undefined, 3],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6],
                'w': [1, undefined, 7]
            },
            '1': {
                'n': [1, undefined, 19]
            },
            '2': {
                'b': [1, undefined, 1],
                'n': [1, undefined, 3],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6],
                'w': [1, undefined, 7]
            },
            '3': {
                'a': [2, 9],
                'r': [2, 9],
                't': [2, 9],
                'u': [2, 9],
                'v': [2, 9],
                'x': [2, 9],
                'p': [2, 9],
                'q': [2, 9],
                'b': [2, 9],
                's': [2, 9],
                'm': [2, 9],
                'l': [2, 9]
            },
            '4': {
                'a': [2, 11],
                'r': [2, 11],
                't': [2, 11],
                'u': [2, 11],
                'v': [2, 11],
                'x': [2, 11],
                'p': [2, 11],
                'q': [2, 11],
                'b': [2, 11],
                's': [2, 11],
                'm': [2, 11],
                'l': [2, 11]
            },
            '5': {
                'a': [2, 12],
                'r': [2, 12],
                't': [2, 12],
                'u': [2, 12],
                'v': [2, 12],
                'x': [2, 12],
                'p': [2, 12],
                'q': [2, 12],
                'b': [2, 12],
                's': [2, 12],
                'm': [2, 12],
                'l': [2, 12]
            },
            '6': {
                'j': [1, undefined, 26],
                'n': [1, undefined, 27]
            },
            '7': {
                'a': [2, 10],
                'r': [2, 10],
                't': [2, 10],
                'u': [2, 10],
                'v': [2, 10],
                'x': [2, 10],
                'p': [2, 10],
                'q': [2, 10],
                'b': [2, 10],
                's': [2, 10],
                'm': [2, 10],
                'l': [2, 10]
            },
            '8': {
                'a': [0],
                'r': [1, undefined, 28]
            },
            '9': {
                'a': [2, 1],
                'r': [2, 1],
                't': [1, undefined, 29],
                'u': [1, undefined, 30],
                'v': [1, undefined, 31],
                'x': [1, undefined, 32]
            },
            '10': {
                'a': [2, 38],
                'r': [2, 38],
                't': [2, 38],
                'u': [2, 38],
                'v': [2, 38],
                'x': [2, 38],
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6]
            },
            '11': {
                'a': [2, 31],
                'r': [2, 31],
                't': [2, 31],
                'u': [2, 31],
                'v': [2, 31],
                'x': [2, 31],
                'p': [2, 31],
                'q': [2, 31],
                'b': [2, 31],
                's': [2, 31],
                'm': [2, 31]
            },
            '12': {
                'a': [2, 32],
                'r': [2, 32],
                't': [2, 32],
                'u': [2, 32],
                'v': [2, 32],
                'x': [2, 32],
                'p': [2, 32],
                'q': [2, 32],
                'b': [2, 32],
                's': [2, 32],
                'm': [2, 32]
            },
            '13': {
                'a': [2, 33],
                'r': [2, 33],
                't': [2, 33],
                'u': [2, 33],
                'v': [2, 33],
                'x': [2, 33],
                'p': [2, 33],
                'q': [2, 33],
                'b': [2, 33],
                's': [2, 33],
                'm': [2, 33]
            },
            '14': {
                'a': [2, 34],
                'r': [2, 34],
                't': [2, 34],
                'u': [2, 34],
                'v': [2, 34],
                'x': [2, 34],
                'p': [2, 34],
                'q': [2, 34],
                'b': [2, 34],
                's': [2, 34],
                'm': [2, 34]
            },
            '15': {
                'a': [2, 35],
                'r': [2, 35],
                't': [2, 35],
                'u': [2, 35],
                'v': [2, 35],
                'x': [2, 35],
                'p': [2, 35],
                'q': [2, 35],
                'b': [2, 35],
                's': [2, 35],
                'm': [2, 35]
            },
            '16': {
                'a': [2, 36],
                'r': [2, 36],
                't': [2, 36],
                'u': [2, 36],
                'v': [2, 36],
                'x': [2, 36],
                'p': [2, 36],
                'q': [2, 36],
                'b': [2, 36],
                's': [2, 36],
                'm': [2, 36]
            },
            '17': {
                'a': [2, 39],
                'r': [2, 39],
                't': [2, 39],
                'u': [2, 39],
                'v': [2, 39],
                'x': [2, 39],
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6]
            },
            '18': {
                'a': [2, 3],
                'r': [2, 3],
                't': [2, 3],
                'u': [2, 3],
                'v': [2, 3],
                'x': [2, 3]
            },
            '19': {
                'c': [1, undefined, 36],
                'd': [1, undefined, 37],
                'e': [1, undefined, 38],
                'f': [1, undefined, 39],
                'g': [1, undefined, 40],
                'h': [1, undefined, 41],
                'i': [1, undefined, 42]
            },
            '20': {
                'l': [2, 26]
            },
            '21': {
                'l': [2, 27]
            },
            '22': {
                'l': [2, 28]
            },
            '23': {
                'l': [2, 29]
            },
            '24': {
                'l': [2, 30]
            },
            '25': {
                'l': [1, undefined, 44]
            },
            '26': {
                'k': [1, undefined, 45]
            },
            '27': {
                'a': [2, 24],
                'r': [2, 24],
                't': [2, 24],
                'u': [2, 24],
                'v': [2, 24],
                'x': [2, 24],
                'p': [2, 24],
                'q': [2, 24],
                'b': [2, 24],
                's': [2, 24],
                'm': [2, 24],
                'l': [2, 24]
            },
            '28': {
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'n': [1, undefined, 3],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6],
                'w': [1, undefined, 7]
            },
            '29': {
                'n': [2, 5],
                'w': [2, 5],
                'p': [2, 5],
                'q': [2, 5],
                'b': [2, 5],
                's': [2, 5],
                'm': [2, 5]
            },
            '30': {
                'n': [2, 6],
                'w': [2, 6],
                'p': [2, 6],
                'q': [2, 6],
                'b': [2, 6],
                's': [2, 6],
                'm': [2, 6]
            },
            '31': {
                'n': [2, 7],
                'w': [2, 7],
                'p': [2, 7],
                'q': [2, 7],
                'b': [2, 7],
                's': [2, 7],
                'm': [2, 7]
            },
            '32': {
                'n': [2, 8],
                'w': [2, 8],
                'p': [2, 8],
                'q': [2, 8],
                'b': [2, 8],
                's': [2, 8],
                'm': [2, 8]
            },
            '33': {
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'n': [1, undefined, 3],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6],
                'w': [1, undefined, 7]
            },
            '34': {
                'a': [2, 40],
                'r': [2, 40],
                't': [2, 40],
                'u': [2, 40],
                'v': [2, 40],
                'x': [2, 40],
                'b': [1, undefined, 1],
                'm': [1, undefined, 2],
                'p': [1, undefined, 4],
                'q': [1, undefined, 5],
                's': [1, undefined, 6]
            },
            '35': {
                'a': [2, 37],
                'r': [2, 37],
                't': [2, 37],
                'u': [2, 37],
                'v': [2, 37],
                'x': [2, 37],
                'p': [2, 37],
                'q': [2, 37],
                'b': [2, 37],
                's': [2, 37],
                'm': [2, 37]
            },
            '36': {
                'a': [2, 19],
                'r': [2, 19],
                't': [2, 19],
                'u': [2, 19],
                'v': [2, 19],
                'x': [2, 19],
                'p': [2, 19],
                'q': [2, 19],
                'b': [2, 19],
                's': [2, 19],
                'm': [2, 19],
                'l': [2, 19]
            },
            '37': {
                'n': [2, 17],
                'o': [2, 17]
            },
            '38': {
                'n': [2, 18],
                'o': [2, 18]
            },
            '39': {
                'n': [2, 13],
                'o': [2, 13]
            },
            '40': {
                'n': [2, 14],
                'o': [2, 14]
            },
            '41': {
                'n': [2, 15],
                'o': [2, 15]
            },
            '42': {
                'n': [2, 16],
                'o': [2, 16]
            },
            '43': {
                'n': [1, undefined, 48],
                'o': [1, undefined, 49]
            },
            '44': {
                'a': [2, 25],
                'r': [2, 25],
                't': [2, 25],
                'u': [2, 25],
                'v': [2, 25],
                'x': [2, 25],
                'p': [2, 25],
                'q': [2, 25],
                'b': [2, 25],
                's': [2, 25],
                'm': [2, 25]
            },
            '45': {
                'l': [1, undefined, 51]
            },
            '46': {
                'a': [2, 2],
                'r': [2, 2],
                't': [1, undefined, 29],
                'u': [1, undefined, 30],
                'v': [1, undefined, 31],
                'x': [1, undefined, 32]
            },
            '47': {
                'a': [2, 4],
                'r': [2, 4],
                't': [2, 4],
                'u': [2, 4],
                'v': [2, 4],
                'x': [2, 4]
            },
            '48': {
                'c': [2, 20]
            },
            '49': {
                'c': [2, 21]
            },
            '50': {
                'c': [1, undefined, 52]
            },
            '51': {
                'a': [2, 23],
                'r': [2, 23],
                't': [2, 23],
                'u': [2, 23],
                'v': [2, 23],
                'x': [2, 23],
                'p': [2, 23],
                'q': [2, 23],
                'b': [2, 23],
                's': [2, 23],
                'm': [2, 23],
                'l': [2, 23]
            },
            '52': {
                'a': [2, 22],
                'r': [2, 22],
                't': [2, 22],
                'u': [2, 22],
                'v': [2, 22],
                'x': [2, 22],
                'p': [2, 22],
                'q': [2, 22],
                'b': [2, 22],
                's': [2, 22],
                'm': [2, 22],
                'l': [2, 22]
            }
        }
    };
    parser.parse = function parse(input, filename) {
        var self = this,
            lexer = self.lexer,
            state,
            symbol,
            action,
            table = self.table,
            gotos = table.gotos,
            tableAction = table.action,
            productions = self.productions,
            valueStack = [null],
            // for debug info
            prefix = filename ? ('in file: ' + filename + ' ') : '',
            stack = [0];

        lexer.resetInput(input);

        while (1) {
            // retrieve state number from top of stack
            state = stack[stack.length - 1];

            if (!symbol) {
                symbol = lexer.lex();
            }

            if (symbol) {
                // read action for current state and first input
                action = tableAction[state] && tableAction[state][symbol];
            } else {
                action = null;
            }

            if (!action) {
                var expected = [],
                    error;
                //#JSCOVERAGE_IF
                if (tableAction[state]) {
                    for (var symbolForState in tableAction[state]) {
                        expected.push(self.lexer.mapReverseSymbol(symbolForState));
                    }
                }
                error = prefix + 'syntax error at line ' + lexer.lineNumber +
                    ':\n' + lexer.showDebugInfo() +
                    '\n' + 'expect ' + expected.join(', ');
                throw new Error(error);
            }

            switch (action[GrammarConst.TYPE_INDEX]) {
            case GrammarConst.SHIFT_TYPE:
                stack.push(symbol);

                valueStack.push(lexer.text);

                // push state
                stack.push(action[GrammarConst.TO_INDEX]);

                // allow to read more
                symbol = null;

                break;

            case GrammarConst.REDUCE_TYPE:
                var production = productions[action[GrammarConst.PRODUCTION_INDEX]],
                    reducedSymbol = production.symbol || production[0],
                    reducedAction = production.action || production[2],
                    reducedRhs = production.rhs || production[1],
                    len = reducedRhs.length,
                    i = 0,
                    ret,
                    $$ = valueStack[valueStack.length - len]; // default to $$ = $1

                ret = undefined;

                self.$$ = $$;

                for (; i < len; i++) {
                    self['$' + (len - i)] = valueStack[valueStack.length - 1 - i];
                }

                if (reducedAction) {
                    ret = reducedAction.call(self);
                }

                if (ret !== undefined) {
                    $$ = ret;
                } else {
                    $$ = self.$$;
                }

                stack = stack.slice(0, -1 * len * 2);
                valueStack = valueStack.slice(0, -1 * len);

                stack.push(reducedSymbol);

                valueStack.push($$);

                var newState = gotos[stack[stack.length - 2]][stack[stack.length - 1]];

                stack.push(newState);

                break;

            case GrammarConst.ACCEPT_TYPE:
                return $$;
            }
        }
    };
    return parser;
})();
if (typeof module !== 'undefined') {
    module.exports = parser;
}
},{}],81:[function(require,module,exports){
/**
 * attr fix for old ie
 * @author yiminghe@gmail.com
 */
var R_BOOLEAN = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
  R_FOCUSABLE = /^(?:button|input|object|select|textarea)$/i,
  R_CLICKABLE = /^a(?:rea)?$/i,
  R_INVALID_CHAR = /:|^on/;

var attrFix = {},
  propFix,
  attrHooks = {
    // http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
    tabindex: {
      get: function (el) {
        // elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
        var attributeNode = el.getAttributeNode('tabindex');
        return attributeNode && attributeNode.specified ?
          parseInt(attributeNode.value, 10) :
          R_FOCUSABLE.test(el.nodeName) ||
          R_CLICKABLE.test(el.nodeName) && el.href ?
            0 :
            undefined;
      }
    }
  },
  boolHook = {
    get: function (elem, name) {
      // 转发到 prop 方法
      return elem[propFix[name] || name] ?
        // 根据 w3c attribute , true 时返回属性名字符串
        name.toLowerCase() :
        undefined;
    }
  },
  attrNodeHook = {};

attrHooks.style = {
  get: function (el) {
    return el.style.cssText;
  }
};

propFix = {
  hidefocus: 'hideFocus',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  'for': 'htmlFor',
  'class': 'className',
  maxlength: 'maxLength',
  cellspacing: 'cellSpacing',
  cellpadding: 'cellPadding',
  rowspan: 'rowSpan',
  colspan: 'colSpan',
  usemap: 'useMap',
  frameborder: 'frameBorder',
  contenteditable: 'contentEditable'
};

var ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
var doc = typeof document !== 'undefined' ? document : {};

function numberify(s) {
  var c = 0;
  // convert '1.2.3.4' to 1.234
  return parseFloat(s.replace(/\./g, function () {
    return (c++ === 0) ? '.' : '';
  }));
}

function ieVersion() {
  var m, v;
  if ((m = ua.match(/MSIE ([^;]*)|Trident.*; rv(?:\s|:)?([0-9.]+)/)) &&
    (v = (m[1] || m[2]))) {
    return doc.documentMode || numberify(v);
  }
}

function mix(s, t) {
  for (var p in t) {
    s[p] = t[p];
  }
}

function each(arr, fn) {
  var i = 0, l = arr.length;
  for (; i < l; i++) {
    if (fn(arr[i], i) === false) {
      break;
    }
  }
}
var ie = ieVersion();

if (ie && ie < 8) {
  attrHooks.style.set = function (el, val) {
    el.style.cssText = val;
  };

  // get attribute value from attribute node for ie
  mix(attrNodeHook, {
    get: function (elem, name) {
      var ret = elem.getAttributeNode(name);
      // Return undefined if attribute node specified by user
      return ret && (
        // fix #100
      ret.specified || ret.nodeValue) ?
        ret.nodeValue :
        undefined;
    }
  });

  // ie6,7 不区分 attribute 与 property
  mix(attrFix, propFix);

  // http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
  attrHooks.tabIndex = attrHooks.tabindex;

  // 不光是 href, src, 还有 rowspan 等非 mapping 属性，也需要用第 2 个参数来获取原始值
  // 注意 colSpan rowSpan 已经由 propFix 转为大写
  each(['href', 'src', 'width', 'height', 'colSpan', 'rowSpan'], function (name) {
    attrHooks[name] = {
      get: function (elem) {
        var ret = elem.getAttribute(name, 2);
        return ret === null ? undefined : ret;
      }
    };
  });

  attrHooks.placeholder = {
    get: function (elem, name) {
      return elem[name] || attrNodeHook.get(elem, name);
    }
  };
}

if (ie) {
  var hrefFix = attrHooks.href = attrHooks.href || {};
  hrefFix.set = function (el, val, name) {
    var childNodes = el.childNodes,
      b,
      len = childNodes.length,
      allText = len > 0;
    for (len = len - 1; len >= 0; len--) {
      if (childNodes[len].nodeType !== 3) {
        allText = 0;
      }
    }
    if (allText) {
      b = el.ownerDocument.createElement('b');
      b.style.display = 'none';
      el.appendChild(b);
    }
    el.setAttribute(name, '' + val);
    if (b) {
      el.removeChild(b);
    }
  };
}

var RE_TRIM = /^[\s\xa0]+|[\s\xa0]+$/g,
  trim = String.prototype.trim;
var SPACE = ' ';

var getElementsByTagName;
getElementsByTagName = function (name, context) {
  return context.getElementsByTagName(name);
};

if (doc.createElement) {
  var div = doc.createElement('div');
  div.appendChild(document.createComment(''));
  if (div.getElementsByTagName('*').length) {
    getElementsByTagName = function (name, context) {
      var nodes = context.getElementsByTagName(name),
        needsFilter = name === '*';
      // <input id='length'>
      if (needsFilter || typeof nodes.length !== 'number') {
        var ret = [],
          i = 0,
          el;
        while ((el = nodes[i++])) {
          if (!needsFilter || el.nodeType === 1) {
            ret.push(el);
          }
        }
        return ret;
      } else {
        return nodes;
      }
    };
  }
}

var compareNodeOrder = ('sourceIndex' in (doc && doc.documentElement || {})) ? function (a, b) {
  return a.sourceIndex - b.sourceIndex;
} : function (a, b) {
  if (!a.compareDocumentPosition || !b.compareDocumentPosition) {
    return a.compareDocumentPosition ? -1 : 1;
  }
  var bit = a.compareDocumentPosition(b) & 4;
  return bit ? -1 : 1;
};

var util = module.exports = {
  ie: ie,

  unique: (function () {
    var hasDuplicate,
      baseHasDuplicate = true;

    // Here we check if the JavaScript engine is using some sort of
    // optimization where it does not always call our comparison
    // function. If that is the case, discard the hasDuplicate value.
    // Thus far that includes Google Chrome.
    [0, 0].sort(function () {
      baseHasDuplicate = false;
      return 0;
    });

    function sortOrder(a, b) {
      if (a === b) {
        hasDuplicate = true;
        return 0;
      }

      return compareNodeOrder(a, b);
    }

    // 排序去重
    return function (elements) {
      hasDuplicate = baseHasDuplicate;
      elements.sort(sortOrder);

      if (hasDuplicate) {
        var i = 1, len = elements.length;
        while (i < len) {
          if (elements[i] === elements[i - 1]) {
            elements.splice(i, 1);
            --len;
          } else {
            i++;
          }
        }
      }
      return elements;
    };
  })(),

  getElementsByTagName: getElementsByTagName,

  getSimpleAttr: function (el, name) {
    var ret = el && el.getAttributeNode(name);
    if (ret && ret.specified) {
      return 'value' in ret ? ret.value : ret.nodeValue;
    }
    return undefined;
  },

  contains: ie ? function (a, b) {
    if (a.nodeType === 9) {
      a = a.documentElement;
    }
    // !a.contains => a===document || text
    // 注意原生 contains 判断时 a===b 也返回 true
    b = b.parentNode;

    if (a === b) {
      return true;
    }

    // when b is document, a.contains(b) 不支持的接口 in ie
    if (b && b.nodeType === 1) {
      return a.contains && a.contains(b);
    } else {
      return false;
    }
  } : function (a, b) {
    return !!(a.compareDocumentPosition(b) & 16);
  },

  isTag: function (el, value) {
    return value === '*' || el.nodeName.toLowerCase() === value.toLowerCase();
  },

  hasSingleClass: function (el, cls) {
    // consider xml
    // https://github.com/kissyteam/kissy/issues/532
    var className = el && util.getSimpleAttr(el, 'class');
    return className && (className = className.replace(/[\r\t\n]/g, SPACE)) &&
      (SPACE + className + SPACE).indexOf(SPACE + cls + SPACE) > -1;
  },

  startsWith: function (str, prefix) {
    return str.lastIndexOf(prefix, 0) === 0;
  },

  endsWith: function (str, suffix) {
    var ind = str.length - suffix.length;
    return ind >= 0 && str.indexOf(suffix, ind) === ind;
  },

  trim: trim ?
    function (str) {
      return str == null ? '' : trim.call(str);
    } :
    function (str) {
      return str == null ? '' : (str + '').replace(RE_TRIM, '');
    },

  attr: function (el, name) {
    var attrNormalizer, ret;
    // scrollLeft
    name = name.toLowerCase();
    // custom attrs
    name = attrFix[name] || name;
    if (R_BOOLEAN.test(name)) {
      attrNormalizer = boolHook;
    } else if (R_INVALID_CHAR.test(name)) {
      // only old ie?
      attrNormalizer = attrNodeHook;
    } else {
      attrNormalizer = attrHooks[name];
    }
    if (el && el.nodeType === 1) {
      // browsers index elements by id/name on forms, give priority to attributes.
      if (el.nodeName.toLowerCase() === 'form') {
        attrNormalizer = attrNodeHook;
      }
      if (attrNormalizer && attrNormalizer.get) {
        return attrNormalizer.get(el, name);
      }
      ret = el.getAttribute(name);
      if (ret === '') {
        var attrNode = el.getAttributeNode(name);
        if (!attrNode || !attrNode.specified) {
          return undefined;
        }
      }
      // standard browser non-existing attribute return null
      // ie<8 will return undefined , because it return property
      // so norm to undefined
      return ret === null ? undefined : ret;
    }
  }
};
},{}]},{},[1]);
