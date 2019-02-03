var express = require("express"); 
var http = require("http");
var socketIO = require("socket.io");
var path = require("path");

var app = express();
app.run(host= '0.0.0.0');
var server = http.createServer(app);
var io = socketIO.listen(server);

server.listen(process.env.PORT || 9002);
app.use(express.static(path.join(__dirname + "/public")));
console.log("Server running on localhost:9002");

var connectedUsers = {};
var drawingHistory = [];
var numConnections = 0;
var currentTurn = "";
var currentWord = "";

function startGame() {
    let randomNum = Math.floor(Math.random() * (numConnections));
    let userID = Object.keys(connectedUsers)[randomNum];
    
    io.to(userID).emit("getWord");
    drawingHistory = [];
    io.sockets.emit("clearCanvas");

    currentTurn = userID;
    updateTurnStatus(userID);
}

function updateTurnStatus(id) {
    io.sockets.emit("guessingTurn", connectedUsers[id]);
    io.to(id).emit("drawingTurn", currentWord);
}

function endGame() {
    io.sockets.emit("idle");
    drawingHistory = [];
    io.sockets.emit("clearCanvas");
    currentWord = "";
    currentTurn = "";
    if (numConnections >= 2) {
        startGame();
    }
}

io.on("connection", function (socket) {
    console.log("connection made with id: " + socket.id);
    numConnections++;
    console.log("Number of players is: " + numConnections);
    connectedUsers[socket.id] = "";

    io.sockets.emit("idle");
    io.sockets.emit("drawPrevious", drawingHistory);
    io.sockets.emit("updateUsers", connectedUsers);

    if (currentTurn === "" && numConnections >= 2) {
        startGame();
    }

    socket.on("disconnect", function () {
        io.sockets.emit("leftRoom", connectedUsers[socket.id]);
        delete connectedUsers[socket.id];
        io.sockets.emit("updateUsers", connectedUsers);
        numConnections--;
        console.log(socket.id + " has discconected, " + 
            numConnections + " players remain");
        if (socket.id === currentTurn || numConnections < 2) {
            endGame();
        }
    });

    socket.on("drawing", function(data) {
        drawingHistory.push(data);
        io.sockets.emit("drawLine", data);
    });

    socket.on("newMessage", function(data) {
        io.sockets.emit("addMessage", data);
        if (data[1].trim().toLowerCase() === currentWord) {
            io.sockets.emit("correctGuess", data[0]);
            endGame();
        }
    });

    socket.on("addUser", function(data) {
        connectedUsers[data[0]] = data[1];
        if (numConnections >= 2) {
            updateTurnStatus(currentTurn);
        }
        io.sockets.emit("updateUsers", connectedUsers);
    });

    socket.on("sendWord", function(data) {
        currentWord = data;
        updateTurnStatus(socket.id);
    });
});