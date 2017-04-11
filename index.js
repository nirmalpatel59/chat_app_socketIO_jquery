let express = require("express"),
    app = express(),
    http = require("http").Server(app),
    cons = require('consolidate'),
    path = require("path"),
    io = require("socket.io")(http),
    users = [];

app.get("/", function (req, res) {
    res.render("index.html");
});
app.engine('html', cons.swig);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.use(express.static("public"));
app.use(express.static("node_modules"));

io.on("connection", function (socket) {
    socket.on("disconnect", function(reason) {
        // console.log(socket);
        var duser = users.filter(function (ele) {
            return ele.socketId == socket.id
        });
        users = users.filter(function(ele) {
            return ele.socketId != socket.id
        });
        console.log("-----------------------disconnected starts-------------");
        console.log(users);
        console.log("-----------------------disconnected ends-------------");
        io.emit('userList', users);
        if(duser && duser.length > 0) {
            io.emit('notifications', duser[0].username + " is offline now.");
        }
    });
    socket.on('chat message', function (msg,msg_data) {
        console.log(socket.id);
        console.log(msg_data);
        // socket.join(socket.id + "_" + msg_data.private_channel);
        var data = {
            msg:msg,
            username:socket.username,
            roomname: socket.id + "_" + msg_data.private_channel
        };
        // if(socket)
        // socket.broadcast.to(msg_data.private_channel).emit("joinRoom", data);
        // socket.emit("joinRoom",data);
        
        // io.sockets.in(socket.id + "_" + msg_data.private_channel).emit("chat message", data);
        socket.broadcast.to(msg_data.private_channel).emit("chat message",data);
        // io.emit('chat message', data);
    });
    // socket.on("joinRoom",function(roomDetails) {
    //     socket.join(roomDetails.roomname);
    //     io.sockets.in(socket.id + "_" + msg_data.private_channel).emit("chat message", data);
    // });
    socket.on('addUser', function (msg) {
        let userdata = {
            socketId: socket.id,
            username:msg
        };
        socket.username = msg;
        users.push(userdata);
        io.emit('userList', users);
    });
    socket.on("typingMessage", function(uname) {
        // console.log(uname);
        socket.broadcast.emit("typingmsg", uname + " is typing"); 
    });
    socket.on("noLongerTypingMessage", function (uname) {
        // console.log(uname);
        socket.broadcast.emit("typingmsg", uname + " is stopped typing");
    });
    socket.on("cleanTypingMessage", function (uname) {
        // console.log(uname);
        socket.broadcast.emit("typingmsg", "");
    });
});

http.listen(3000, function () {
    console.log("server is running on ", 3000);
});
