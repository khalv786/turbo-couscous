//declare variables
var map;
var source = new ol.source.Vector({
    wrapX: false,
});
var SelectedFeature;
var project;
var projectID;

// when the page first loads
window.onload = function init() {

    //create a base vector layer to draw on
    var vector = new ol.layer.Vector({
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
    socket.emit('new project', project);
    //display project name
    fillProjectLabel();
}

function openProject() {

    //enter name of the project the user would like to open
    project = prompt("Enter the room name you would like to join");
    //emit project to open
    socket.emit('JoinRoom', project);
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
};

//send update geometry to database
function updateFeatureDatabase(projectID, oldGeom, newGeom) {
    socket.emit('update feature geometry', ({ ID: projectID, oldGeometry: oldGeom, newGeometry: newGeom}));
}


function bufferfeature() {
    //if a feature is selected
    if (SelectedFeature != null) {
        //loop until a numeric value is entered
        do {
            var bufferAmount = parseInt(window.prompt("Please enter a value to buffer by in metres", ""), 10);
        } while (isNaN(bufferAmount));
        var oldFeature = SelectedFeature.clone();
        //create parser
        var parser = new jsts.io.OL3Parser();
        //ask parser to read the geometry of the feature
        var jstsGeom = parser.read(SelectedFeature.getGeometry());
        // buffer the feature by the buffer amount
        var buffered = jstsGeom.buffer(bufferAmount);
        //
       // source.removeFeature(SelectedFeature);
        //vectorLayer.getSource().removeFeature(SelectedFeature);
        // convert back from JSTS and replace the geometry on the feature
       // removeOldFeature(oldFeature);
        SelectedFeature.setGeometry(parser.write(buffered));
        //update old geometry to new geometry in database
        updateFeatureDatabase(projectID, oldFeature.getGeometry().getCoordinates(), SelectedFeature.getGeometry().getCoordinates());
        
        //retrieve the feature type
        var value = SelectedFeature.getGeometry().getType();
        //emit to make a new feature for other clients
        switch (value) {
            case 'Polygon':                
                //socket.emit('new polygon', ({ ID: projectID, Geometry: SelectedFeature.getGeometry().getCoordinates() }));
                break;
            case 'Circle':
                socket.emit('new circle', ({ ID: projectID, Geometry: SelectedFeature.getGeometry().getRadius() + "," + SelectedFeature.getGeometry().getCenter() }));
                break;
            case 'LineString':
                socket.emit('new linestring', ({ ID: projectID, Geometry: SelectedFeature.getGeometry().getCoordinates()}));
                break;
            case 'Point':
                socket.emit('new point', ({ ID: projectID, Geometry: SelectedFeature.getGeometry().getCoordinates() }));
                break;
        }      
    } else {
        //if no feature is selected on the map
        alert("No feature selected");
    }
     
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

//redraw shape using the geometry provided
function redrawShape(geom) {

    var feature = new ol.Feature({
        name: "Thing",
        geometry: geom
    });
    source.addFeature(feature);
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

                // retrieve the feature
                var feature = event.feature

                var newFeature = feature;
                //remove the draw interaction
                map.removeInteraction(draw);
                //emit the feature and project ID to other clients
                switch (value) {
                    case 'Polygon':                       
                        socket.emit('new polygon', ({ ID : projectID , Geometry :feature.getGeometry().getCoordinates() }));
                        break;
                    case 'Circle':
                        socket.emit('new circle', ({ ID: projectID, Geometry: feature.getGeometry().getRadius() + "," + feature.getGeometry().getCenter() }));
                        break;
                    case 'LineString':
                        socket.emit('new linestring', ({ ID: projectID, Geometry: feature.getGeometry().getCoordinates() }));
                        break;
                    case 'Point':
                        socket.emit('new point', ({ ID: projectID, Geometry: feature.getGeometry().getCoordinates() }));
                        break;
                }

            });
        }
    }

    