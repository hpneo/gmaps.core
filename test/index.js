describe('Creating a map', function() {
  var basicMap, advancedMap, mapWithEvents, mapWithCustomControls;

  it('should throw an error if element is not defined', function() {
    expect(function() {
      new GMaps({});
    }).toThrow('No element defined.');
  });

  describe('With basic options', function() {
    beforeEach(function() {
      basicMap = basicMap || new GMaps({
        el : '#basic-map',
        lat: -12.0433,
        lng: -77.0283,
        zoom: 12
      });
    });

    it('should create a GMaps object', function() {
      expect(basicMap).toExist();
    });

    it('should have centered the map at the initial coordinates', function() {
      var lat = basicMap.getCenter().lat();
      var lng = basicMap.getCenter().lng();

      expect(lat).toEqual(-12.0433);
      expect(lng).toEqual(-77.0283);
    });

    it('should have the correct zoom', function() {
      expect(basicMap.getZoom()).toEqual(12);
    });
  });

  describe('With advanced controls', function() {
    beforeEach(function() {
      advancedMap = advancedMap || new GMaps({
        el : '#advanced-map',
        lat: -12.0433,
        lng: -77.0283,
        zoomControl : true,
        panControl : false,
        streetViewControl : false,
        mapTypeControl: false,
        overviewMapControl: false
      });
    });

    it('should show the defined controls', function() {
      expect(advancedMap.map.get('zoomControl')).toBe(true);
      expect(advancedMap.map.get('panControl')).toBe(false);
      expect(advancedMap.map.get('streetViewControl')).toBe(false);
      expect(advancedMap.map.get('mapTypeControl')).toBe(false);
      expect(advancedMap.map.get('overviewMapControl')).toBe(false);
    });
  });

  describe('With events', function() {
    var callbacks, current_zoom = 0, current_center = null;

    beforeEach(function() {
      callbacks = {
        onclick : function(e) {
          // var lat = e.latLng.lat();
          // var lng = e.latLng.lng();

          // mapWithEvents.addMarker({
          //   lat : lat,
          //   lng : lng,
          //   title : 'New Marker'
          // });
          // console.log('onclick');
        },
        onzoomchanged : function() {
          // console.log('onzoomchanged');
          current_zoom = this.getZoom();
        },
        oncenterchanged : function() {
          // console.log('oncenterchanged');
          current_center = this.getCenter();
        }
      };

      expect.spyOn(callbacks, 'onclick').andCallThrough();
      expect.spyOn(callbacks, 'onzoomchanged').andCallThrough();
      expect.spyOn(callbacks, 'oncenterchanged').andCallThrough();

      mapWithEvents = mapWithEvents || new GMaps({
        el : '#map-with-events',
        lat : -12.0433,
        lng : -77.0283,
        click : callbacks.onclick,
        zoom_changed : callbacks.onzoomchanged,
        center_changed : callbacks.oncenterchanged
      });
    });

    it('should respond to zoom_changed event', function() {
      mapWithEvents.map.setZoom(16);

      expect(callbacks.onzoomchanged).toHaveBeenCalled();
      expect(current_zoom).toEqual(16);
    });

    it('should respond to center_changed event', function() {
      mapWithEvents.map.setCenter(new google.maps.LatLng(-12.0907, -77.0227));

      // Fix for floating-point bug
      var lat = parseFloat(current_center.lat().toFixed(4));
      var lng = parseFloat(current_center.lng().toFixed(4));

      expect(callbacks.oncenterchanged).toHaveBeenCalled();
      expect(lat).toEqual(-12.0907);
      expect(lng).toEqual(-77.0227);
    });

    it('should respond to click event', function() {
      google.maps.event.trigger(mapWithEvents.map, 'click', {
        latLng : new google.maps.LatLng(-12.0433, -77.0283)
      });

      expect(callbacks.onclick).toHaveBeenCalled();
      // expect(mapWithEvents.markers.length).toEqual(1);
    });

    afterEach(function() {
      document.getElementById('map-with-events').innerHTML = '';
      mapWithEvents = null;
    });
  });

  // Move to gmaps.controls
  /*describe('With custom controls', function() {
    var callbacks;

    beforeEach(function() {
      callbacks = {
        onclick : function() {
          console.log('control.onclick');
          // mapWithCustomControls.addMarker({
          //   lat : mapWithCustomControls.getCenter().lat(),
          //   lng : mapWithCustomControls.getCenter().lng()
          // });
        }
      }

      expect.spyOn(callbacks, 'onclick').andCallThrough();

      mapWithCustomControls = new GMaps({
        el : '#map-with-custom-controls',
        lat : -12.0433,
        lng : -77.0283
      });

      mapWithCustomControls.addControl({
        position : 'top_right',
        content : 'Add marker at the center',
        style : {
          margin: '5px',
          padding: '1px 6px',
          border: 'solid 1px #717B87',
          background: '#fff'
        },
        events : {
          click: callbacks.onclick
        }
      });
    });

    it('should add the control to the controls collection', function() {
      expect(mapWithCustomControls.controls.length).toEqual(1);
    });

    it('should respond to click event attached to the custom control', function() {
      google.maps.event.trigger(mapWithCustomControls.controls[0], 'click');

      expect(callbacks.onclick).toHaveBeenCalled();
      // expect(mapWithCustomControls.markers.length).toEqual(1);
    });
  });*/
});