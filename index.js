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
function insertFeature(mapid, geometry, guid) {
    var query = client.query("INSERT INTO features (geometry, mapid, guid) VALUES ('" + geometry + "', '" + mapid + "', '" + guid + "')");
}

//update geometry of feature in database
function updateGeometry(id,oldGeometry, newGeometry, callback) {
    client.query("UPDATE features SET geometry = '" + newGeometry + "'::text || geometry WHERE  geometry = '" + oldGeometry + "';", function (err, result) {
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

function joinAndEmitProject(id) {

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
        returnMapID(room, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                // extract just the value
                var id = extractValue(data.rows);
                console.log("user joined :" + id);
                socket.join(id);
                io.sockets.in(id).emit('send ID to client', id);
            }

        });
    });

    //to create a new project
    socket.on('new project', function (room) {

        insertMap(room, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                //extract value
                var id = extractValue(data.rows);
                console.log("user created and joined :" + id);
                //open project
                socket.join(id);
                //send mapID to client
                io.sockets.in(id).emit('send ID to client', id);
            }
        });
    });

    socket.on('new polygon', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid)

        io.sockets.in(msg.ID).emit('new polygon', msg.Geometry);
    });

    socket.on('new point', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid)

        io.sockets.in(msg.ID).emit('new point', msg.Geometry);
    });

    socket.on('new circle', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid)

        io.sockets.in(msg.ID).emit('new circle', msg.Geometry);
    });

    socket.on('new linestring', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid)

        io.sockets.in(msg.ID).emit('new linestring', msg.Geometry);
    });

    

    socket.on('update feature geometry', function (msg) {
        updateGeometry(msg.ID, msg.oldGeometry, msg.newGeometry, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            }
            else {
                console.log('Record Updated ' + data.affectedRows + ' rows');
                // io.emit('delete feature', msg);
            }
        });
    });
});

    http.listen(3000, function () {
        console.log('listening on *:3000');
});
