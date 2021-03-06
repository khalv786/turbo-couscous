//declare global variables
var express = require('express');

var fs = require('fs');
var path = require('path'); 
var app = express();
var http = require('http').Server(app);
var results = [];
//var numUsers = 0;

var users = [[]];
 

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
function insertMap(room,attributes, callback)
{
    client.query("INSERT INTO maps (mapname, attribute) VALUES ('" + room + "', '" + attributes + "') RETURNING mapid", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);

    });
}

//return map ID
function returnMapIDandAttribute(room, callback) {
    client.query("SELECT mapid, attribute FROM maps mapname WHERE mapname = ('" + room + "')", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

//insert feature into database
function insertFeature(mapid, geometry, guid, value) {
    var query = client.query("INSERT INTO features (geometry, mapid, guid, value) VALUES ('" + geometry + "', '" + mapid + "', '" + guid + "', '" + value + "')");
}

//update geometry of feature in database
function updateFeatureGeometry(guid, newGeometry, callback) {
    client.query("UPDATE features SET geometry = '" + newGeometry + "'::text || geometry WHERE  guid = '" + guid + "';", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

//update geometry of feature in database
function updateFeatureValue(guid, value, callback) {
    client.query("UPDATE features SET value = '" + value + "' WHERE  guid = '" + guid + "';", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

//update geometry of feature in database
function styleFeature(guid, colour, callback) {
    client.query("UPDATE features SET colour = '" + colour + "' WHERE  guid = '" + guid + "';", function (err, result) {
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
        returnMapIDandAttribute(room.Name, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {
                try {
                    // extract just the value
                    var id = extractValue(data.rows);
                    var attribute = data.rows.map(function (a) { return a.attribute; });
                    attribute = attribute[0];
                    if (room.CurrentProject != "") {
                        socket.leave(room.CurrentProject);
                        console.log("user left room:" + room.CurrentProject);
                    }
                    console.log("user joined :" + id);
                    users.push([id, room.NickName, socket.id]);
                    socket.join(id);
                    io.sockets.in(id).emit('send ID to client', { ID: id, ATTRIBUTE: attribute, NICKNAME: room.NickName, USERS: users });

                    var features = returnFeatures(id);
                }
                catch (err) {
                    // no room found
                    socket.join(room.RandomID);
                    io.sockets.in(room.RandomID).emit('No project found', { err });
                    socket.leave(room.RandomID);
                }

            }
        });
    });

    //to create a new project
    socket.on('new project', function (room) {

        insertMap(room.Name, room.Attribute, function (err, data) {
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
                users.push([id, room.NickName, socket.id]);
                //open project
                socket.join(id);
                //send mapID to client
                io.sockets.in(id).emit('send ID to client', { ID: id, ATTRIBUTE: room.Attribute, NICKNAME: room.NickName, USERS: users });

            }
        });
    });

    socket.on('new feature', function (msg) {

        insertFeature(msg.ID, msg.Geometry, msg.Guid, msg.Value)

        io.sockets.in(msg.ID).emit('new feature', ({ Geometry: msg.Geometry, Guid: msg.Guid, Value: msg.Value }));
    });

    socket.on('update feature value', function (msg) {

        updateFeatureValue(msg.Guid, msg.Value, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            }
        });

        io.sockets.in(msg.ID).emit('update feature value', ({ Guid: msg.Guid, Value: msg.Value }));
    });

    socket.on('update feature', function (msg) {

        updateFeatureGeometry(msg.Guid, msg.Geometry, function (err, data) {
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

    socket.on('disconnect', function () {
        console.log(socket.id);
        var projectID;
        for (var i in users) {
            var user = users[i];
            
            if (user[2] == socket.id) {
                projectID = user[0]
                users.splice(i, 1);
                break;
            }
        }
        console.log(users);
        io.sockets.in(projectID).emit('update editors', ({ USERS: users }));
    });

    socket.on('style feature', function (msg) {

        styleFeature(msg.Guid, msg.Colour, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            }
        });

        io.sockets.in(msg.ID).emit('style feature', ({ Guid: msg.Guid, Colour: msg.Colour}));
    });

});

    http.listen(3000, function () {
        console.log('listening on *:3000');
});
