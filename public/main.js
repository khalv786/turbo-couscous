//declare variables
var map;
var source = new ol.source.Vector({
    wrapX: false,
});
var SelectedFeature;
var project;
var projectID = "";
var vector;

// when the page first loads
window.onload = function init() {

    //create a base vector layer to draw on
    vector = new ol.layer.Vector({
        source: source,
    });

    //create map layer
    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    //create map
    map = new ol.Map({
    //add lares to map
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
 //Instantiate with some options and add the Control for search functionality

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

 // select interaction on map
 var selectSingleClick = new ol.interaction.Select();
    selectSingleClick.on('select', function (e) {
        var feature = e.selected[0];
        if (feature != undefined) {
            SelectedFeature = feature;
            //display area of feature 
            setArea(feature.getGeometry().getArea());
            var guid = feature.get("guid");
            setProperties(guid);

        } else {
            //remove area if no feature is selected
            removeArea()
            FeatureToBuffer = null;
        }
        
 });
   
 map.addInteraction(selectSingleClick);
};

function newProject() {
    //prompt for user to enter map name
    project = prompt("Enter Name of Map");
    //emit new project
    socket.emit('new project', { Name: project, CurrentProject: projectID});
    //display project name
    fillProjectLabel();
}

function openProject() {

    //enter name of the project the user would like to open
    project = prompt("Enter the project name you would like to open");
    //emit project to open
    socket.emit('JoinRoom', { Name: project, CurrentProject: projectID});
    //display project name
    fillProjectLabel();
}

//display project name
function fillProjectLabel(){
    var projectName = document.getElementById("projectName");
    projectName.innerText = project;
}

function fillID(id) {
    projectID = id;
}

function notImplemented() {
    alert("Not Implemented");
}

function bufferfeature() {
    //if a feature is selected
    if (SelectedFeature != null) {
        //loop until a numeric value is entered
        do {
            var bufferAmount = parseInt(window.prompt("Please enter a value to buffer by in metres", ""), 10);
        } while (isNaN(bufferAmount));

        var guid = SelectedFeature.get("guid");
  
        //create parser
        var parser = new jsts.io.OL3Parser();
        //ask parser to read the geometry of the feature
        var jstsGeom = parser.read(SelectedFeature.getGeometry());
        // buffer the feature by the buffer amount
        var buffered = jstsGeom.buffer(bufferAmount);
        
        // convert back from JSTS and replace the geometry on the feature

        SelectedFeature.setGeometry(parser.write(buffered));

        var wktRepresenation = WKTRepresentation(SelectedFeature);       
        
        //emit to make a new feature for other clients
        socket.emit('update feature', ({ ID: projectID, Geometry: wktRepresenation, Guid: guid }));
    
    } else {
        //if no feature is selected on the map
        alert("No feature selected");
    }
     
}

function clients() {
    var clients = io.of('/chat').clients();
    var clients = io.of('/chat').clients('room'); // all users from room `room`
    document.getElementById("clients").innerHTML = clients;
}


//remove area from label
function removeArea() {
    document.getElementById("area").innerHTML = "Nothing Selected";
}

//set area of feature in label
function setArea(area) {
    var areaSqKm = Math.round(area / 1000000 * 100) / 100;
    document.getElementById("area").innerHTML = "Selected Area: " + areaSqKm + " km<sup>2</sup>";
}

function setProperties(property) {
    document.getElementById("properties").innerHTML = "Guid: " + property;
}

//lead client
function deletefeature() {
    if (SelectedFeature != null) {
        var id = SelectedFeature.get("guid");
        var features = returnFeatureList();
        for (var i = 0, l = features.length; i < l; i++) {
            var feature = features[i];
            var guid = feature.get("guid")
            if (guid == id) {
                vector.getSource().removeFeature(feature);
                socket.emit('delete feature', ({ ID: projectID, Guid: id }));
            }
            break;
        }
    }
}

function returnFeatureList() {
    return source.getFeatures();
}


//other clients
function removeFeature(msg) {

    var features = returnFeatureList();
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var guid = feature.get("guid")
        if (guid == msg.Guid) {
            vector.getSource().removeFeature(feature);
        }
        break;
    }
}

//redraw shape using the geometry provided
function redrawShape(geom, Guid) {
    wkt = new ol.format.WKT;
    var feature = wkt.readFeature(geom);
    feature.set("guid", Guid);
    source.addFeature(feature);
}

function modifyShape(geom, Guid) {
    var features = source.getFeatures();
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var guid = feature.get("guid")
        if (guid == Guid) {
            source.removeFeature(feature);
        }
        break;
    }
    redrawShape(geom, Guid);
}

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function WKTRepresentation(feature) {
    var ol3Geom = feature.getGeometry();
    var format = new ol.format.WKT();
    var wktRepresenation = format.writeGeometry(ol3Geom);
    return wktRepresenation;  
}



    // global so we can remove it later
    var draw; 
    function drawShape(value) {
        //select the type of shape to draw
        var value = value;
        if (value !== 'None') {
            draw = new ol.interaction.Draw({
                source: source,
                type: /** @type {ol.geom.GeometryType} */ (value)

            });
            //add the interaction to the map
            map.addInteraction(draw);
            //after drawing the feature
            draw.on('drawend', function (event) {
                var id = guid();

                // retrieve the feature
                var feature = event.feature
                feature.set("guid", id);
                
                var newFeature = feature;
                var type = feature.getGeometry().getType();
                //remove the draw interaction
                map.removeInteraction(draw);
                var wktRepresenation = WKTRepresentation(feature);
                //emit the feature and project ID to other clients
                socket.emit('new feature', ({ ID: projectID, Geometry: wktRepresenation, Guid: id, Type: type }));
            });
        }
    }

    