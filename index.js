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
client.connect();

var query = client.query("SELECT * FROM maps");
query.on('row', function (row) {
    console.log(row);
});

query.on('end', function () {
    client.end();
});

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




io.on('connection', function (socket) {



    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('new polygon', function (msg) {
        var mapid = 1;
        var query = client.query("Insert into features (geometry, mapid) VALUES(ST_GeomFromText(' + msg + '),1)");
        query.on('row', function (row) {
            console.log(row);
        });
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
});





    http.listen(3000, function () {
        console.log('listening on *:3000');
});
