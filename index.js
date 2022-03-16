var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var routes = require('./routes');
var brain = require('./brain');
var socket_helper = require('./socket_helper');
var config = require('./config');

// Serve the frontend folder
app.use(express.static(__dirname + "/frontend"));

// Initialize the brain, in charge of maintaining the current playlist
brain.init();

// Initialize the socket helper, handling inputs and outputs using socketio
socket_helper.init(io, brain);

// Initialize the backend REST API
routes.init(app, brain);

var port = config.port || 3000;
http.listen(port, function(){
    console.log('listening on *:' + port);
});
