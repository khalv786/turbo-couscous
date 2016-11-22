var map;

var source = new ol.source.Vector({ wrapX: false });

source.set("name", "my_layer_name");



window.onload = function init() {


    //create a base vector layer to draw on
    var vector = new ol.layer.Vector({
        source: source,
        style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            })
        })
    })
    });

    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });




    //create map
 map = new ol.Map({
    layers: [raster, vector],
    target: 'map',
    controls: ol.control.defaults({
        attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
            collapsible: false
        })
    }),
    view: new ol.View({
        center: [0, 0],
        zoom: 2
    })
    });

 //Instantiate with some options and add the Control
 var geocoder = new Geocoder('nominatim', {
     provider: 'photon',
     lang: 'en',
     placeholder: 'Search for ...',
     limit: 5,
     debug: true,
     autoComplete: true,
     keepOpen: true
 });
 map.addControl(geocoder);



 /**
* Popup
**/
 var container = $('#popup'),
     content = $('popup-content'),
     closer = $('popup-closer'),
     overlay = new ol.Overlay({
         element: container,
         offset: [0, -40]
     });
 closer.onclick = function () {
     overlay.setPosition(undefined);
     closer.blur();
     return false;
 };
 map.addOverlay(overlay);
}


function addLayer() {
    var layer = prompt("Please enter a layer name");

    if (layer != null) {
        var vector = new ol.layer.Vector({
            title:layer,
            source: source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });

        map.addLayer(layer);
        
    }
}

    var draw; // global so we can remove it later
    function drawPolygon(value) {
        
            var geometryFunction, maxPoints;
            if (value === 'Square') {
                value = 'Circle';
                geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
            } else if (value === 'Box') {
                value = 'LineString';
                maxPoints = 2;
                geometryFunction = function (coordinates, geometry) {
                    if (!geometry) {
                        geometry = new ol.geom.Polygon(null);
                    }
                    var start = coordinates[0];
                    var end = coordinates[1];
                    geometry.setCoordinates([
                        [start, [start[0], end[1]], end, [end[0], start[1]], start]
                    ]);
                    return geometry;
                };
            }
            var layers = map.getLayers();
            draw = new ol.interaction.Draw({
                source: source,
                type: value,
                geometryFunction: geometryFunction,
                maxPoints: maxPoints
            });
            
            map.addInteraction(draw);

            draw.on('drawend', function (event) {

                // Get the array of features
                var features = source.getFeatures();

                if (features.length != 0) {
                    var last_element = features[features.length - 1];

                    console.log(last_element.getGeometry().getCoordinates());
                    socket.emit('new polygon', last_element.getGeometry().getCoordinates());
                    socket.emit('chat message', last_element.getGeometry().getCoordinates());
                }
            });

    }

    


    