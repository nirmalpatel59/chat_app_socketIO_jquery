// var io = require('socket.io')(3000);
// var 


let express = require("express"),
    app = express(),
    http = require("http").Server(app),
    cons = require('consolidate'),
    path = require("path"),
    io = require("socket.io")(http),
    redisClient = require('redis'),
    redis = require('socket.io-redis'),
    users = [],
    redisInstance = redisClient.createClient(6379, "127.0.0.1");;
    io.adapter(redis({ host: 'localhost', port: 6379 }));

app.get("/", function (req, res) {
    res.render("index.html");
});
app.engine('html', cons.swig);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.use(express.static("public"));
app.use(express.static("node_modules"));

io.on("connection", function (socket) {
    // redisInstance.hmset(msg, 'socketId', socket.id);
    socket.on("disconnect", function (reason) { 
        // console.log(socket);
        var duser = users.filter(function (ele) {
            return ele.socketId == socket.id
        });
        users = users.filter(function (ele) {
            return ele.socketId != socket.id
        });
        // console.log("-----------------------disconnected starts-------------");
        // console.log(users);
        // console.log("-----------------------disconnected ends-------------");
        io.emit('userList', users);
        if (duser && duser.length > 0) {
            io.emit('notifications', duser[0].username + " is offline now.");
        }
    });
    socket.on('chat message', function (msg_data) {
        console.log(msg_data);
        redisInstance.hgetall(msg_data.receiver, function (err, reply) {
            if(err) {
                console.log(err);
            }else {
                var sset = getSortedSetKey(msg_data.sender, msg_data.receiver);
                redisInstance.zadd(sset, Date.now(), msg_data.msg);
                var data = {
                    sender: msg_data.sender,
                    receiver:msg_data.receiver,
                    msg:msg_data.msg
                };
                socket.broadcast.to(reply.socketId).emit("chat message", data);
            }
        });
        // socket.join(socket.id + "_" + msg_data.private_channel);
        // if(socket)
        // socket.broadcast.to(msg_data.private_channel).emit("joinRoom", data);
        // socket.emit("joinRoom",data);

        // io.sockets.in(socket.id + "_" + msg_data.private_channel).emit("chat message", data);
        // io.emit('chat message', data);
    });
    // socket.on("joinRoom",function(roomDetails) {
    //     socket.join(roomDetails.roomname);
    //     io.sockets.in(socket.id + "_" + msg_data.private_channel).emit("chat message", data);
    // });
    socket.on('addUser', function (msg) {
        redisInstance.sismember('users', msg, function(err,status) {
            if(err) {
                console.log(err);
            }else {
                if(status !== 1) {
                    redisInstance.sadd('users', msg);
                    console.log(socket.id);
                    console.log(msg);
                }
                redisInstance.hset(msg, 'socketId', socket.id, function (err, res) {
                    socket.username = msg;
                    getAllUsers(msg);
                });
            }
        });
        // let userdata = {
        //     socketId: socket.id,
        //     username: msg
        // };
        // var mydata = [];
        // mydata.push(userdata);
        // users.push(userdata);
    });
    socket.on("typingMessage", function (uname) {
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
    socket.on("updateSocket", function (uname) {
        console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
        console.log(uname);console.log(socket.id);
        console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
        redisInstance.hmset(uname, 'socketId', socket.id);
    });
    io.of('/').adapter.clients(function (err, clients) {
        if(err) {
            console.log("in if");
            console.log(err);
        }else {
            console.log("in else");
            console.log(clients);
        }
        // console.log(clients); // an array containing all connected socket ids
    });
});

app.get("/getUser",function(req,res) {
    var reqUserName = req.query.username;
    console.log(reqUserName);
    redisInstance.sismember('users', reqUserName, function(err,userStatusCode) {
        if(err) {
            res.send(err);
        }else {
            if (userStatusCode === 1) {
                // socket.username = msg;
                getAllUsers(reqUserName);
                // redisInstance.hmset(msg, 'socketId', socket.id);
                // redisInstance.sadd('users', msg);
                redisInstance.hgetall(reqUserName, function(err, obj){
                    console.log(obj);
                    var userdata = {
                        username: reqUserName,
                        socketId: obj
                    };
                    res.send(userdata);
                });
            }else {
                res.json({"msg":"user not found"}).sendStatus(404);
            }
        }
    });
});

http.listen(3000, function () {
    console.log("server is running on ", 3000);
});

function getAllUsers(msg) {
    // redisInstance.hset(msg, "socketId","");
    redisInstance.smembers('users', function (err, obj) {
        var userInfo = {
            cUser: msg,
            userlist: obj
        }
        io.emit('userList', userInfo);
    });
}

function getSortedSetKey(user1, user2) {
    var tempstring;
    if(user1 < user2) {
        tempstring = user1 + "_" + user2;
    }else {
        tempstring = user2 + "_" + user1;
    }
    return tempstring;
}