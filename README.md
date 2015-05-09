# gmaps.core

Contains the base for create simple maps using Google Maps API. It serves as base for other gmaps.js modules.

## Install

For using with bundlers (as Browserify or Webpack):

`npm install gmaps.core --save`

For using directly in the browser, download the `gmaps.core.js` (or `gmaps.core.min.js`) in `dist`.

## Usage

You need to register a `<script>` tag with the Google Maps JavaScript API, then import gmaps.core.

Every Google Maps map needs a container (`<div id="map"></div>` in this demo), which needs to have width and height, and be visible (without `display: none`, for example):

```
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <script src="http://maps.google.com/maps/api/js?sensor=true"></script>
  <script src="gmaps.core.js"></script>
  <style type="text/css">
    #map {
      width: 400px;
      height: 400px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new GMaps({
      el : '#basic-map',
      lat: -12.0433,
      lng: -77.0283,
      zoom: 12
    });
  </script>
</body>
</html>
```

For more examples you can check the tests in this repo.

## Documentation

### Constructor / initialize: `new GMaps(options)`

Creates a new instance of `GMaps`, a wrapper for simpler use of the Google Maps JavaScript API. The new instance has the same methods of `google.maps.Map`.

`GMaps` accepts all the [MapOptions](https://developers.google.com/maps/documentation/javascript/reference#MapOptions) and [events](https://developers.google.com/maps/documentation/javascript/reference#Map) listed in the Google Maps API.

### `fitZoom()`

Adjust the map zoom to include all the markers added in the map.

### `fitLatLngBounds(latLngs)`

Adjust the map zoom to include all the coordinates in the `latLngs` array. `latLngs` must be an array of `google.maps.LatLng` objects.

### `setCenter(lat, lng, callback)`

Center the map using the `lat` and `lng` coordinates. If a callback if passed, it triggers after the center.

### `getElement()`

Returns the HTML element container of the map.

### `zoomIn()`

Increase the map's zoom in 1 point.

### `zoomOut()`

Decrease the map's zoom in 1 point.

### `refresh()`

Trigger a `resize` event, useful if you need to repaint the current map (for changes in the viewport or display / hide actions).

### `GMaps.arrayToLatLng(coords, useGeoJSON)`

Returns an array of `google.maps.LatLng` objects. If `useGeoJSON` is true, inverts the order of `coords` before convert it, since GeoJSON format has the order `longitude, latitude` instead Google Maps' `latitude, longitude`. Supports simple or multi-dimensional arrays.

### `GMaps.coordsToLatLngs(coords, useGeoJSON)`

Returns a `google.maps.LatLng` object from a two-elements array. If `useGeoJSON` is true, inverts the order of `coords` before convert it, since GeoJSON format has the order `longitude, latitude` instead Google Maps' `latitude, longitude`.

## Changelog

For pre 0.5.0 versions, check [gmaps.js changelog](https://github.com/hpneo/gmaps#changelog)

### 0.5.0

* Node module format (CommonJS)
* New method: `getElement()`
* New static methods: `GMaps.arrayToLatLng`, `GMaps.coordsToLatLngs`

## License

MIT License. Copyright 2015 Gustavo Leon. http://github.com/hpneo

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.