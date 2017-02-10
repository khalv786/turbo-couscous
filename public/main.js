//declare variables
var map;
var source = new ol.source.Vector({
    wrapX: false,
});
var SelectedFeature;
var project;
var projectID = "";
var vector;
var attribute = ""
var selectSingleClick;
var initialLoad = true;


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
 selectSingleClick = new ol.interaction.Select();
    selectSingleClick.on('select', function (e) {
        var feature = e.selected[0];
        if (feature != undefined) {
            SelectedFeature = feature;
            //display area of feature 
            setArea(feature.getGeometry().getArea());
            //var guid = feature.get("guid");
            setProperties(feature);

        } else {
            //remove area if no feature is selected
            removeArea()
            FeatureToBuffer = null;
            removeProperties();
        }
        
 });
   
 map.addInteraction(selectSingleClick);
};

//$(document).ready(function () {

//    var cookieName = 'firstPageLoad';
//    var cookieValue = 1;
//    // if the cookie doesn't exist we're on the first page load...
//    if (!$.cookie(cookieName)) {
//        // and set a cookie that is valid for the entire domain
//        $.cookie(cookieName, cookieValue, { path: '/' });
//        $('#mappage').hide()
//        $('#loginpage').show()
//    } 
//    // if the cookie does exist, its (most probably) a succeeding page load...
//    else {
//        $('#mappage').hide()
//        $('#loginpage').show()
//    }
//});

function submit() {
    //document.getElementById("mappage").style.left = "100%";
    //document.getElementById("mappage").style.position = "block";
    //document.getElementById("loginpage").style.left = "200%";
    //document.getElementById("loginpage").style.position = "absolute%";
    //$("#mappage").show();
    //$("#loginpage").hide();
    //map.updateSize();

    //map.setSize([100,100]);
    
    
}

function newProject() {
    //prompt for user to enter map name
    project = prompt("Enter Name of Map");
    var attribute = addAttribute();
    //emit new project
    socket.emit('new project', { Name: project, CurrentProject: projectID, Attribute: attribute});
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

function fillID(id, attributeP) {
    projectID = id;
    attribute = attributeP;
    console.log(projectID, attribute);
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

function styleFeatures() {
    features = returnFeatureList();
    var UniqueAttributes = [];
    
    var value;
    var isInside;
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var guid = feature.get("guid")
        value = feature.get(attribute);
        isInside = contains(UniqueAttributes, value)
        if (isInside == false) {
            UniqueAttributes.push(value);
        }
    }
    console.log(UniqueAttributes);

    var string = $('html').attr('class');
    //var array = string.split(' ');
   // var arrayLength = parseInt(array.length);

    //for (i = 0; i <= UniqueAttributes.length; i++) {
    //    $("#test table").append('<tr><td>' + UniqueAttributes[i] + '</td></tr>')

    //}

    for (var i = 0; i < UniqueAttributes.length; i++) {
        var trd = "";
        trd += "<tr>";
        trd += "<td><label id=value>"+ UniqueAttributes[i];+ " <label> </td>";
        trd += "<td>";
        trd += "<select class='input-small'><option value=''>Blue</option><option value=''>Green</option><option value=''>Red</option></select>";
        trd += "</td>";
        
        trd += "</tr>";
        $(".table-bordered tbody").append(trd);
        //document.getElementById("value").innerText = UniqueAttributes[i];
    }

    var btnOpenModel = document.getElementById("btnOpenModel")
    btnOpenModel.click();


}


function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
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

function setProperties(feature) {
    var guid = feature.get("guid");
    if (attribute != undefined) {
        var attributeValue = feature.get(attribute);
        document.getElementById("properties").innerHTML = "ID: " + guid + "\n" + attribute + ": " + attributeValue;
    } else {
        document.getElementById("properties").innerHTML = "ID: " + guid;
    } 
}

function removeProperties() {
    document.getElementById("properties").innerHTML = "";
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
function redrawShape(geom, Guid, Value) {
    wkt = new ol.format.WKT;
    var feature = wkt.readFeature(geom);
    feature.set("guid", Guid);
    feature.set(attribute, Value);
    source.addFeature(feature);
}

function modifyShape(geom, Guid) {
    var features = selectSingleClick.getFeatures();
    features.clear();
    var features = source.getFeatures();
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var guid = feature.get("guid")
        if (guid == Guid) {
            var value = feature.get(attribute);
            source.removeFeature(feature);
        }
        break;
    }
    redrawShape(geom, Guid, value);
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

function addAttribute() {
    
    var attributes = ""
    while (true) {
        var addAttribute = confirm("Would you like to add attributes to the feature");
        if (addAttribute == true) {
            var AttributeName = prompt("What is the name of the attribute");
            
            attributes = AttributeName;
            break;
           
        } else { break;}
    }
    return attributes;
}

function addValue() {
    return prompt("Enter the value of the " + attribute);
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

                if (attribute != undefined) {
                    var attributeValue = addValue();
                }
                var id = guid();

                // retrieve the feature
                var feature = event.feature
                feature.set("guid", id);
                if (attributeValue != undefined) {
                    feature.set(attribute, attributeValue);
                }
                
                var newFeature = feature;
                var type = feature.getGeometry().getType();
                //remove the draw interaction
                map.removeInteraction(draw);
                setProperties(feature);
                var wktRepresenation = WKTRepresentation(feature);
                //emit the feature and project ID to other clients
                socket.emit('new feature', ({ ID: projectID, Geometry: wktRepresenation, Guid: id, Type: type, Value: attributeValue }));
            });
        }
    }

    