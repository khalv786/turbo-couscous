//declare variables
var map;
var source = new ol.source.Vector({
    wrapX: false,
});
var SelectedFeature;
var project;
var projectID = "";
var vector;
var attribute = "undefined";
var selectSingleClick;
var initialLoad = true;
var UniqueAttributes = [];
var originalFeatureStyle;
var fill;
// global so we can remove it later
var draw;
var nickName = "";

// when the page first loads
window.onload = function init() {
    createName();
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
     if (SelectedFeature instanceof ol.Feature) {
         SelectedFeature = styleFeature(SelectedFeature, 1.25, null);
         SelectedFeature = undefined;         
     }
     SelectedFeature = e.selected[0];
     if (SelectedFeature instanceof ol.Feature) {
            SelectedFeature = styleFeature(SelectedFeature, 2, null);            
            //display area of feature 
            if (SelectedFeature.getGeometry().getType() != 'Point') {
                setArea(SelectedFeature.getGeometry().getArea());
            }           
            setProperties(SelectedFeature);

        } else {
            SelectedFeature = e.deselected[0];
            //remove area if no feature is selected
            removeArea();
            removeProperties();
            SelectedFeature = styleFeature(SelectedFeature,1.25, null);
            SelectedFeature = undefined;
        }
        
 });
   
 map.addInteraction(selectSingleClick);
};

function createName() {

    while (nickName == "") {
        nickName = prompt("What is your name");
    } 
}


function appendUser(users) {
    $(".table-inverse tbody").empty();
    for (var i = 0; i < users.length; i++){
        var record = users[i];
        if (record[0] == projectID) {
           
                var editing = record[1];
               // console.log(editing);
                var trd = "";
    trd += "<tr>";
    trd += "<td><label id=value>" + editing + " <label> </td>";
    trd += "</tr>";

    $(".table-inverse tbody").append(trd);
            
        }
    }

}

function newProject() {
    //prompt for user to enter map name
    project = prompt("Enter Name of Map");
    if (project) {
        clearFeatures();
        addAttribute();
        //emit new project
        socket.emit('new project', { Name: project, CurrentProject: projectID, Attribute: attribute, NickName: nickName });
        //display project name
        displayMap();
        fillProjectLabel();
    }
}

function displayMap() {
    //document.getElementById('edit').style.visibility = "visible";
    document.getElementById('mapSection').style.visibility = "visible";

}

function returnFillColour(Feature) {
    try {

        var style = Feature.getStyle();
        fill = style.fill_.color_;
        return fill;
    } catch (err) {

    }
}


function styleFeature(SelectedFeature, width, colour) {
    if (colour == null) {
        fill = returnFillColour(SelectedFeature);
    }
    else {
        fill = colour;
    }
    if (SelectedFeature.getGeometry().getType() != "Point" && fill != undefined) {
        
        var featureStyle = new ol.style.Style({
            fill: new ol.style.Fill({ color: fill }),
            stroke: new ol.style.Stroke({
                width: width,
                color: '#3399CC'
            })
        });
        SelectedFeature.setStyle(featureStyle);
    }
    return SelectedFeature;
}

function clientStyleFeature(guid, colour) {
    var features = returnFeatureList();
    colour = ol.color.asArray(colour);
    colour = colour.slice();
    colour[3] = 0.2;
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var Guid = feature.get('guid');
        if (Guid == guid) {           
            styleFeature(feature, 1.25, colour);

        }
    }       
}


function openProject() {
   
    //enter name of the project the user would like to open
    project = prompt("Enter the project name you would like to open");

    if (project) {
        //emit project to open
        socket.emit('JoinRoom', { Name: project, CurrentProject: projectID, RandomID: createGuid(), NickName: nickName });
    }
}



function clearFeatures() {
    source.clear();
}

//display project name
function fillProjectLabel(){
    var projectName = document.getElementById("projectName");
    projectName.innerText = project;
}

function fillID(id, attributeP, users) {

    projectID = id;
    attribute = attributeP;

    appendUser(users);
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

    UniqueAttributes = [];
    $(".table-bordered tbody").empty();
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


    for (var i = 0; i < UniqueAttributes.length; i++) {
        var trd = "";
        trd += "<tr>";
        trd += "<td><label id=value>"+ UniqueAttributes[i];+ " <label> </td>";
        trd += "<td>";
        trd += "<select id='colourPicker" + i +"' class='input-small'><option value=''>Blue</option><option value=''>Green</option><option value=''>Red</option><option value=''>Yellow</option></select>";
        trd += "</td>";
        
        trd += "</tr>";
        $(".table-bordered tbody").append(trd);
    }

    var btnOpenModel = document.getElementById("btnOpenModel")
    btnOpenModel.click();


}

function applyStyle() {
    var features = returnFeatureList();
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var value = feature.get(attribute);
        var guid = feature.get('guid');
        for (var j = 0; j <= UniqueAttributes.length; j++)

            if (value == UniqueAttributes[j]) {
                var e = document.getElementById("colourPicker" + j);
                var colour = e.options[e.selectedIndex].text;
                colour = colourNameToHex(colour);
                var hex = colour;
                colour = ol.color.asArray(colour);
                colour = colour.slice();
                colour[3] = 0.2;
                styleFeature(feature, 1.25, colour);

                socket.emit('style feature', ({ ID: projectID, Guid: guid, Colour: hex }));
            }
    }
}

function colourNameToHex(colour) {
    var colours = {
        "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff", "aquamarine": "#7fffd4", "azure": "#f0ffff",
        "beige": "#f5f5dc", "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd", "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a", "burlywood": "#deb887",
        "cadetblue": "#5f9ea0", "chartreuse": "#7fff00", "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed", "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff",
        "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b", "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b", "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f",
        "darkorange": "#ff8c00", "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a", "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f", "darkturquoise": "#00ced1",
        "darkviolet": "#9400d3", "deeppink": "#ff1493", "deepskyblue": "#00bfff", "dimgray": "#696969", "dodgerblue": "#1e90ff",
        "firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22", "fuchsia": "#ff00ff",
        "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff", "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080", "green": "#008000", "greenyellow": "#adff2f",
        "honeydew": "#f0fff0", "hotpink": "#ff69b4",
        "indianred ": "#cd5c5c", "indigo": "#4b0082", "ivory": "#fffff0", "khaki": "#f0e68c",
        "lavender": "#e6e6fa", "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd", "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff", "lightgoldenrodyellow": "#fafad2",
        "lightgrey": "#d3d3d3", "lightgreen": "#90ee90", "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa", "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de",
        "lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32", "linen": "#faf0e6",
        "magenta": "#ff00ff", "maroon": "#800000", "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3", "mediumpurple": "#9370d8", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee",
        "mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585", "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1", "moccasin": "#ffe4b5",
        "navajowhite": "#ffdead", "navy": "#000080",
        "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23", "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6",
        "palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee", "palevioletred": "#d87093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9", "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd", "powderblue": "#b0e0e6", "purple": "#800080",
        "rebeccapurple": "#663399", "red": "#ff0000", "rosybrown": "#bc8f8f", "royalblue": "#4169e1",
        "saddlebrown": "#8b4513", "salmon": "#fa8072", "sandybrown": "#f4a460", "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d", "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090", "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4",
        "tan": "#d2b48c", "teal": "#008080", "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0",
        "violet": "#ee82ee",
        "wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5",
        "yellow": "#ffff00", "yellowgreen": "#9acd32"
    };

    if (typeof colours[colour.toLowerCase()] != 'undefined')
        return colours[colour.toLowerCase()];

    return false;
}


function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
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
    if (attribute != "undefined") {
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
function redrawShape(geom, Guid, Value, Colour) {
    wkt = new ol.format.WKT;
    var feature = wkt.readFeature(geom);
    feature.set("guid", Guid);
    feature.set(attribute, Value);

    source.addFeature(feature);
    if (Colour != undefined) {
        clientStyleFeature(Guid, Colour);
    }
}

function modifyShape(geom, Guid) {
    var features = selectSingleClick.getFeatures();
    features.clear();
    var features = source.getFeatures();
    for (var i = 0, l = features.length; i < l; i++) {
        var feature = features[i];
        var guid = feature.get("guid")
        if (guid == Guid) {
            //feature.setGeometry(geom);
            var value = feature.get(attribute);
           
            var fill = returnFillColour(feature);
            source.removeFeature(feature);
           redrawShape(geom, Guid, value, fill);
        }
        break;
    }

}

function createGuid() {
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
    
   // var attribute;
    while (true) {
        var addAttribute = confirm("Would you like to add attributes to the feature");
        if (addAttribute == true) {
            var AttributeName = prompt("What is the name of the attribute");
            
            attribute = AttributeName;
            break;
           
        } else {
            //return attribute;
            break;
        }
    }
   // return attribute;
}

function addValue() {
    return prompt("Enter the value of the " + attribute);
}
 
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

                if (attribute != "undefined") {
                    var attributeValue = addValue();
                }
                var id = createGuid();

                // retrieve the feature
                var feature = event.feature
                feature.set("guid", id);
                if (attributeValue != "") {
                    feature.set(attribute, attributeValue);
                }
               
                //remove the draw interaction
                map.removeInteraction(draw);
                setProperties(feature);
                var wktRepresenation = WKTRepresentation(feature);
                
                //emit the feature and project ID to other clients
                socket.emit('new feature', ({ ID: projectID, Geometry: wktRepresenation, Guid: id, Value: attributeValue }));
            });
        }
    }

    var socket = io();

    $('form').submit(function () {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');

        return false;
    });

    socket.on('update editors', function (msg) {
        //msg.USERS;
        appendUser(msg.USERS);
    });

    socket.on('new feature', function (msg) {
        redrawShape(msg.Geometry, msg.Guid, msg.Value);
    });

    socket.on('update feature', function (msg) {

        modifyShape(msg.Geometry, msg.Guid);
    });

    socket.on('send ID to client', function (data) {
        fillID(data.ID, data.ATTRIBUTE, data.USERS);
    });

    socket.on('chat message', function (msg) {
        $('#messages').append($('<li>').text(msg));
    });

    socket.on('delete feature', function (msg) {
        removeFeature(msg);
    });

    socket.on('No project found', function (msg) {
        alert("Project not found");
    });

    socket.on('features', function (msg) {
        clearFeatures();
        displayMap();
        fillProjectLabel();
       // console.log(msg);
        var geom;
        var i;
        for (i = 0; i < msg.length; i++) {
            var value = msg[i];
            var format = new ol.format.WKT();
            redrawShape(value.geometry, value.guid, value.value, value.colour);
        }
    });

    socket.on('style feature', function (msg) {
        clientStyleFeature(msg.Guid, msg.Colour);
    });
    