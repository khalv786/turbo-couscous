var map;

var source = new ol.source.Vector({
    wrapX: false,
});

var SelectedFeature;


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
            SelectedFeature = feature; 
            setArea(feature.getGeometry().getArea());
       
            //var properties = event.element.getProperties();

        } else {
            removeArea()
            FeatureToBuffer = null;
        }
        
 });
   
 map.addInteraction(selectSingleClick);
};

function newProject() {
    var name = prompt("Enter Name of Map");

    socket.emit('subscribe', name);

    socket.emit('send message', {
        room: name,
        message: "Some message"
    });

}


function bufferfeature() {
    //if a feature is selected
    if (SelectedFeature != null) {
        //loop until a numeric value is entered
        do {
            var bufferAmount = parseInt(window.prompt("Please enter a value to buffer by in metres", ""), 10);
        } while (isNaN(bufferAmount));

        //create parser
        var parser = new jsts.io.OL3Parser();
        //ask parser to read the geometry of the feature
        var jstsGeom = parser.read(SelectedFeature.getGeometry());
        // buffer the feature by the buffer amount
        var buffered = jstsGeom.buffer(bufferAmount);
        // convert back from JSTS and replace the geometry on the feature
        SelectedFeature.setGeometry(parser.write(buffered));
       // removeSelectedFeature();
        var value = SelectedFeature.getGeometry().getType();
        switch (value) {
            case 'Polygon':
                console.log(SelectedFeature.getGeometry().getCoordinates());
                socket.emit('new polygon', SelectedFeature.getGeometry().getCoordinates());
                break;
            case 'Circle':
                socket.emit('new circle', SelectedFeature.getGeometry().getRadius() + "," + SelectedFeature.getGeometry().getCenter());
                break;
            case 'LineString':
                socket.emit('new linestring', SelectedFeature.getGeometry().getCoordinates());
                break;
            case 'Point':
                socket.emit('new point', SelectedFeature.getGeometry().getCoordinates());
                break;
        }      
    } else {
        //if no feature is selected on the map
        alert("No feature selected");
    }
     
}


function removeSelectedFeature() {
    var features = source.getFeatures();
    if (features != null && features.length > 0) {
        for (x in features) {
            var coordinates = features[x].getGeometry().getCoordinates();

            if (SelectedFeature.getGeometry().getCoordinates() == coordinates) {
                source.removeFeature(features[x]);
                socket.emit('delete feature', x);
                break;
            }
        }
    }
}


function removeFeature(deletedFeature) {
    var features = source.getFeatures();
    if (features != null && features.length > 0) {
        for (x in features) {
            //var id = x.id;
            if (deletedFeature.getGeometry().getCoordinates() == features[x].getGeometry().getCoordinates()) {
                source.removeFeature(features[x]);
                break;
            }
        }
    }
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
        //id: newID,
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
                //socket.emit('newID', feature.getId);
                var newFeature = feature;
                //console.log(feature.getId());
                map.removeInteraction(draw);
                switch (value) {
                    case 'Polygon':
                        
                        console.log(feature.getGeometry().getCoordinates());
                        socket.emit('new polygon', feature.getGeometry().getCoordinates());
                       // console.log(feature);
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

    