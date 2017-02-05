//declare global variables
var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var results = [];
var numUsers = 0;

var pg = require("pg");
// address of postgres database
var connectionString = "postgres://awsuser:Harbour245@landapp.crxi70wzgj6y.eu-central-1.rds.amazonaws.com:5432/LandAppFiles"

var client = new pg.Client(connectionString);

client.connect(function (err) {

    if (err) console.log(err)
})

app.use(express.static('public'));

//create a route
app.get('/', function (req, res) {
    res.sendfile('public/index.html');
});

var io = require('socket.io')(http);

//insert map and return map ID 
function insertMap(room, callback)
{
    client.query("INSERT INTO maps (mapname) VALUES ('" + room + "') RETURNING mapid", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);

    });
}

//return map ID
function returnMapID(room, callback) {
    client.query("SELECT mapid FROM maps mapname WHERE mapname = ('" + room + "')", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

//insert feature into database
function insertFeature(mapid, geometry, guid, type) {
    var query = client.query("INSERT INTO features (geometry, mapid, guid, type) VALUES ('" + geometry + "', '" + mapid + "', '" + guid + "', '" + type + "')");
}

//update geometry of feature in database
function updateFeature(guid, newGeometry, callback) {
    client.query("UPDATE features SET geometry = '" + newGeometry + "'::text || geometry WHERE  guid = '" + guid + "';", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

function deleteFeature(guid, callback) {
    client.query("DELETE FROM features WHERE guid = '" + guid + "';", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

function extractValue(output) {
    var value = JSON.stringify(output);
    value = value.match(/\d+/)[0];
          
    return value;
}

function returnFeatures(projectID) {

    var query = client.query("SELECT * FROM features where mapid = ('" + projectID + "')", function (err, result) {
        if (err) throw err;

        // just print the result to the console
        console.log(result.rows); // outputs: { name: 'brianc' }
        io.sockets.in(projectID).emit('features', result.rows);
    });
       }

io.on('connection', function (socket) {

    socket.on('returnRoomID', function (room) {
        returnMapID(room, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                // extract just the value
                var id = extractValue(data.rows)
                //emit polygon to right project
                io.sockets.in(id).emit('new polygon', id);
            }
        })
    });
    //when user opens a project
    socket.on('JoinRoom', function (room) {
        returnMapID(room.Name, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                // extract just the value
                var id = extractValue(data.rows);
                
                if (room.CurrentProject != "") {
                    socket.leave(room.CurrentProject);
                    console.log("user left room:" + room.CurrentProject);
                }
                console.log("user joined :" + id);
                socket.join(id);
                io.sockets.in(id).emit('send ID to client', id);

                var features = returnFeatures(id);
            }
        });
    });

    //to create a new project
    socket.on('new project', function (room) {

        insertMap(room.Name, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                //extract value
                var id = extractValue(data.rows);
                
                if (room.CurrentProject != "") {
                    socket.leave(room.CurrentProject);
                    console.log("user left room:" + room.CurrentProject);
                }
                console.log("user created and joined :" + id);
                //open project
                socket.join(id);
                //send mapID to client
                io.sockets.in(id).emit('send ID to client', id);
            }
        });
    });

    socket.on('new feature', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid, msg.Type)

        io.sockets.in(msg.ID).emit('new feature', ({ Geometry: msg.Geometry, Guid: msg.Guid }));
    });

    socket.on('update feature', function (msg) {

        updateFeature(msg.Geometry, msg.Guid, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            }
        });

        io.sockets.in(msg.ID).emit('update feature', ({ Geometry: msg.Geometry, Guid: msg.Guid }));
    });

    socket.on('delete feature', function (msg) {

        deleteFeature(msg.Guid, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            }
        });

        io.sockets.in(msg.ID).emit('delete feature', ({ Guid: msg.Guid }));
    });
});

    http.listen(3000, function () {
        console.log('listening on *:3000');
});
