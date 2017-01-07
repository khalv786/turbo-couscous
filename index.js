var express = require('express');

var fs = require('fs');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var results = [];
var numUsers = 0;

var pg = require("pg");

var connectionString = "postgres://awsuser:Harbour245@landapp.crxi70wzgj6y.eu-central-1.rds.amazonaws.com:5432/LandAppFiles"

var client = new pg.Client(connectionString);

client.connect(function (err) {

    if (err) console.log(err)
})

app.use(express.static('public'));

//app.configure(function () {
//    app.set('port', process.env.PORT || 8000);
//    app.use(express.static(path.join(__dirname, 'public')));
//});
//var server = http.createServer(app);
//server.listen(app.get('port'), function () {
//    console.log("Express server listening on port " + app.get('port'));
//});

//create a route
app.get('/', function (req, res) {
    res.sendfile('public/index.html');
});

var io = require('socket.io')(http);

function returnID(room, callback)
{
    client.query("INSERT INTO maps (mapname) VALUES ('" + room + "') RETURNING mapid", function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);

    });

}

// function you can use:
function getSecondPart(str) {
    return str.split(':')[1];
}
// use the function:



io.on('connection', function (socket) {

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('subscribe', function (room) {

        console.log('joining room', room);

        returnID(room, function (err, data) {
            if (err) {
                // error handling code goes here
                console.log("ERROR : ", err);
            } else {            
                // code to execute on data retrieval
                var id =JSON.stringify(data.rows);
                id = id.match(/\d+/)[0];
                console.log("user joined :" + id);
                socket.join(id);
            }
        });
    });

    socket.on('send message', function (data) {
        console.log('sending room post', data.room);
        socket.broadcast.to(data.room).emit('conversation private post', {
            message: data.message
        });

    });

    socket.on('room', function (room) {
        socket.join(room);
    });

    socket.on('new polygon', function (msg) {
        console.log('sending room post', msg.room);
        socket.broadcast.to(data.room).emit('feature', {
            message: msg.message
        });
    });

    socket.on('new polygon', function (msg) {

        var query = client.query("INSERT INTO features (geometry, mapid) VALUES ('"+ msg+ "', 1)");

        io.emit('new polygon', msg);
    });

    socket.on('new point', function (msg) {
        io.emit('new point', msg);
    });

    socket.on('new circle', function (msg) {
        io.emit('new circle', msg);
    });

    socket.on('new linestring', function (msg) {
        io.emit('new linestring', msg);
    });

    socket.on('delete feature', function (msg) {
        io.emit('delete feature', msg);
    });

});

    http.listen(3000, function () {
        console.log('listening on *:3000');
});
