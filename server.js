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
    socket.on("disconnect", function (reason) { 
        var duser = users.filter(function (ele) {
            return ele.socketId == socket.id
        });
        users = users.filter(function (ele) {
            return ele.socketId != socket.id
        });
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
                var dateNum = Date.now();
                redisInstance.zadd(sset, Number(dateNum), (msg_data.sender +": "+msg_data.msg));
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
        socket.broadcast.emit("typingmsg", uname + " is typing");
    });
    socket.on("noLongerTypingMessage", function (uname) {
        socket.broadcast.emit("typingmsg", uname + " is stopped typing");
    });
    socket.on("cleanTypingMessage", function (uname) {
        socket.broadcast.emit("typingmsg", "");
    });
    socket.on("updateSocket", function (uname) {
        redisInstance.hmset(uname, 'socketId', socket.id);
    });
    io.of('/').adapter.clients(function (err, clients) {
        if(err) {
            console.log(err);
        }else {
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

app.get("/getMessages", function(req,res) {
    var sender = req.query.sender;
    var receiver = req.query.receiver;
    var chat_id = getSortedSetKey(sender, receiver);
    console.log(chat_id);
    var args = [chat_id, 0, -1, 'withscores'];
    redisInstance.zrange(args, function(err, members) {
        if(err) {
            res.send(err);
        }else {
            console.log(members);
            var data = {
                sender:sender,
                receiver:receiver,
                history:members
            }
            res.send(data);
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
    console.log("in sorted");
    console.log(user1);
    console.log(user2);
    var tempstring;
    if(user1 < user2) {
        tempstring = user1 + "_" + user2;
    }else {
        tempstring = user2 + "_" + user1;
    }
    return tempstring;
}