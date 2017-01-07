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

//var query = client.query("SELECT * FROM maps");
//var query = client.query("INSERT INTO features (geometry, mapid) VALUES ('hi', 1)");
//query.on('row', function (row) {
//    console.log(row);
//});

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

    socket.on('subscribe', function (room) {
        console.log('joining room', room);
        var query = client.query("INSERT INTO maps (mapname) VALUES ('" + room + "')");
        var query = client.query("SELECT mapid FROM maps order by mapid desc limit 1", function(err, rows, fields)
        {
            if (err) throw err;

            console.log(rows[0]);
        });  
        socket.join(row);
    });

    socket.on('send message', function (data) {
        console.log('sending room post', data.room);
        socket.broadcast.to(data.room).emit('conversation private post', {
            message: data.message
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
