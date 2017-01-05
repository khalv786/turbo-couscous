var map;

var source = new ol.source.Vector({ wrapX: false });

var FeatureToBuffer;

var selectedFeatureID;

window.onload = function init() {

    //create a base vector layer to draw on
    var vector = new ol.layer.Vector({
        source: source,
    });

    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

 


    //create map
    map = new ol.Map({
    //interactions: ol.interaction.defaults().extend([select, modify]),
    layers: [raster, vector],
    target: 'map',
    controls: ol.control.defaults({
        attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
            collapsible: false
        })
    }),
    view: new ol.View({
        center: [0,0],
        zoom: 2
    })
    });

 //https://github.com/jonataswalker/ol3-geocoder
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


    //https://github.com/jonataswalker/ol3-geocoder
 /**
* Popup
**/
 var container = document.getElementById('popup'),
     content = document.getElementById('popup-content'),
     closer = document.getElementById('popup-closer'),
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

 var select = null;  // ref to currently selected interaction

 // select interaction working on "singleclick"
 var selectSingleClick = new ol.interaction.Select();
    selectSingleClick.on('select', function (e) {
        var feature = e.selected[0];
        if (feature != undefined) {
            FeatureToBuffer = feature;
            selectedFeatureID = feature.id; 
            setArea(feature.getGeometry().getArea());
       
            //var properties = event.element.getProperties();

        } else {
            removeArea()
            FeatureToBuffer = null;
        }
        
 });
   
 map.addInteraction(selectSingleClick);
 


};

function bufferfeature() {
    //if a feature is selected
    if (FeatureToBuffer != null) {
        //loop until a numeric value is entered
        do {
            var bufferAmount = parseInt(window.prompt("Please enter a value to buffer by in metres", ""), 10);
        } while (isNaN(bufferAmount));

        //create parser
        var parser = new jsts.io.OL3Parser();
        //ask parser to read the geometry of the feature
        var jstsGeom = parser.read(FeatureToBuffer.getGeometry());
        // buffer the feature by the buffer amount
        var buffered = jstsGeom.buffer(bufferAmount);
        // convert back from JSTS and replace the geometry on the feature
        FeatureToBuffer.setGeometry(parser.write(buffered));
        removeSelectedFeature();
        var value = FeatureToBuffer.getGeometry().getType();
        switch (value) {
            case 'Polygon':
                socket.emit('new polygon', FeatureToBuffer.getGeometry().getCoordinates());
                break;
            case 'Circle':
                socket.emit('new circle', FeatureToBuffer.getGeometry().getRadius() + "," + FeatureToBuffer.getGeometry().getCenter());
                break;
            case 'LineString':
                socket.emit('new linestring', FeatureToBuffer.getGeometry().getCoordinates());
                break;
            case 'Point':
                socket.emit('new point', FeatureToBuffer.getGeometry().getCoordinates());
                break;
        }
        //socket.emit('buffered shape', FeatureToBuffer);

        
    } else {
        //if no feature is selected on the map
        alert("No feature selected");
    }
     
}

function removeSelectedFeature() {
    var features = source.getFeatures();
    if (features != null && features.length > 0) {
        for (x in features) {
            var properties = features[x].getProperties();
            var id = properties.id;
            if (id == selectedFeatureID) {
                source.removeFeature(features[x]);
                socket.emit('delete feature', selectedFeatureID);
                break;
            }
        }
    }
}


function removeFeature(deletedFeatureID) {
    var features = source.getFeatures();
    if (features != null && features.length > 0) {
        for (x in features) {
            var id = x.id;
            if (deletedFeatureID == id) {
                source.removeFeature(features[x]);
                break;
            }
        }
    }
}

function addFeature(msg) {

}

function removeArea() {
    document.getElementById("area").innerHTML = "Nothing Selected";
}

function setArea(area) {
    var areaSqKm = Math.round(area / 1000000 * 100) / 100;
    document.getElementById("area").innerHTML = "Selected Area: " + areaSqKm + " km<sup>2</sup>";
}

function redrawShape(geom) {
    var feature = new ol.Feature({
        name: "Thing",
        geometry: geom
    });

    source.addFeature(feature);
}

    var draw; // global so we can remove it later
    function drawShape(value) {

        var value = value;
        if (value !== 'None') {
            draw = new ol.interaction.Draw({
                source: source,
                type: /** @type {ol.geom.GeometryType} */ (value)
            });
            map.addInteraction(draw);

            draw.on('drawend', function (event) {

                // Get the array of features
                var feature = event.feature

                map.removeInteraction(draw);
                switch (value) {
                    case 'Polygon':
                        socket.emit('new polygon', feature.getGeometry().getCoordinates());
                        break;
                    case 'Circle':
                        socket.emit('new circle', feature.getGeometry().getRadius() + "," + feature.getGeometry().getCenter());
                        break;
                    case 'LineString':
                        socket.emit('new linestring', feature.getGeometry().getCoordinates());
                        break;
                    case 'Point':
                        socket.emit('new point', feature.getGeometry().getCoordinates());
                        break;
                }

            });
        }
    }

    