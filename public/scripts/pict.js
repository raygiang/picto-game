var canvas  = document.getElementById("drawing-area");
var playerList = document.getElementById("player-list");
var messageArea = document.getElementById("messages");
var typingBox = document.getElementById("typing-area");
var updateArea = document.getElementById("updates");
var selColour = document.getElementById("colour-picker");
var clearButton = document.getElementById("clear-button");
var context = canvas.getContext("2d");
var socket;
var startPosition = {
    xPos: 0,
    yPos: 0
}
var endPosition = {
    xPos: 0,
    yPos: 0
}
var isDrawing = false;
var username = "";

function updatePosition(e, position) {
    let canvasBounds = canvas.getBoundingClientRect();
    position.xPos = e.clientX - Math.floor(canvasBounds.left);
    position.yPos = e.clientY - Math.floor(canvasBounds.top);
}

function updateAndEmit(e) {
    updatePosition(e, endPosition);
    socket.emit("drawing", [startPosition, endPosition, selColour.value]);
}

function drawing(e) {
    if (isDrawing) {
        updatePosition(e, startPosition);
        setTimeout(updateAndEmit, 25, e);
    }
}

function drawLine(startX, startY, endX, endY, colour) {
    context.beginPath();
    context.strokeStyle = colour;
    context.lineWidth = 2;
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.closePath();
}

function initSocketListeners() {
    socket.on("drawLine", function(data) {
        drawLine(data[0].xPos, data[0].yPos, data[1].xPos, data[1].yPos, data[2]);
    });

    socket.on("drawPrevious", function(data) {
        for(let i in data) {
            drawLine(data[i][0].xPos, data[i][0].yPos, data[i][1].xPos, 
                data[i][1].yPos, data[i][2]);
        }
    });

    socket.on("updateUsers", function(data) {
        playerList.innerHTML = "<div>Player List: </div>";
        for (let i in data) {
            playerList.innerHTML += "<div class='player'>" + 
                "<div class='username'>" + data[i].username + "</div>" + 
                "<div class='score'>" + "Score: " + data[i].score + "</div>" +
                "</div>";
        }
    });

    socket.on("addMessage", function(data) {
        console.log(data);
        messageArea.innerHTML += "<div><span class='username'>" + data[0] + 
            "</span>: " + data[1] + "</div>";
        messageArea.scrollTop = messageArea.scrollHeight;        
    });

    socket.on("drawingTurn", function(data) {
        updateArea.innerHTML = "Your Turn, you are drawing: " + data.toUpperCase();
        canvas.onmousemove = function(e) { drawing(e); };
        typingBox.disabled = true;
        clearButton.disabled = false;
    });

    socket.on("guessingTurn", function(data) {
        updateArea.innerHTML = data.username + " is currently drawing";
        canvas.onmousemove = null;
        typingBox.disabled = false;
        clearButton.disabled = true;
    });

    socket.on("idle", function() {
        updateArea.innerHTML = "Waiting for players...";
        canvas.onmousemove = function(e) { drawing(e); };
        typingBox.disabled = false;
        clearButton.disabled = false;
    });

    socket.on("clearCanvas", function() {
        context.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("getWord", function() {
        socket.emit("sendWord", getRandomWord());
    });

    socket.on("correctGuess", function(data) {
        messageArea.innerHTML += "<div><span class='correct'>Congratulations, " 
        + data + " you are correct!</span></div>"; 
        messageArea.scrollTop = messageArea.scrollHeight;
    });

    socket.on("leftRoom", function(data) {
        messageArea.innerHTML += "<div><span class='warning'>" + data + 
        " has left the room.</span></div>"; 
        messageArea.scrollTop = messageArea.scrollHeight;
    });
}

function pageInit() {
    canvas.width = 855;
    canvas.height = 350;

    canvas.onmousedown = function() { isDrawing = true };
    canvas.addEventListener("touchstart", function(e) {
        e.preventDefault();
        let mouseDownEvent = new MouseEvent("mousedown", {});
        canvas.dispatchEvent(mouseDownEvent);
    });

    canvas.onmousemove = function(e) { drawing(e); };
    canvas.addEventListener("touchmove", function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        let mouseMoveEvent = new MouseEvent("mousemove", {
            "clientX":touch.pageX,
            "clientY":touch.pageY
        });
        canvas.dispatchEvent(mouseMoveEvent);
    });

    canvas.onmouseup = function() { isDrawing = false };
    canvas.addEventListener("touchend", function(e) {
        e.preventDefault();
        let mouseUpEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseUpEvent);
    });

    while (username === null || username.trim() === "") {
        username = prompt("Please enter a username");
    }
    socket = io.connect();
    initSocketListeners();
    socket.emit("addUser", username);

    typingBox.addEventListener("keypress", function(e) {
        if (e.keyCode == 13) {
            socket.emit("newMessage", typingBox.value);
            typingBox.value = "";
        }
    });

    clearButton.onclick = function() {
        socket.emit("clearDrawing");
    };
}

window.onload = pageInit;