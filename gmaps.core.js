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