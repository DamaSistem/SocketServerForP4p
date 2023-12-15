var Game = require('./game.js');
var Positions = require('./sitPositions.js');
var {s4Create} = require('./helper.js');

var Room = function(io,roomCapacity) {
    this.id = s4Create();
    this.users = [];
    this.userCount = 0;
    this.isGameStarted = false;
    this.available = true;
    this.maxUserCount = roomCapacity;
    
    this.io = io;
    this.game = new Game(this);
    //this.hostId = hostId;
    
    this.availableSitPositions = new Positions();
    this.playAgainCount = 0;
}

Room.prototype.addUser = function(user) {
   
	this.users.push(user);
    
	this.userCount = this.users.length;

    this.io.to(this.id).emit("userCount",{userCount:this.users.length,maxUserCount:this.maxUserCount});

    var sitPos = this.availableSitPositions.find(a => a.userid == null);
    sitPos.userid = user.id;
    this.io.to(user.id).emit("sitPosition",sitPos.sitposition);
    
    if(this.users.length == this.maxUserCount){
        this.startGame();
    }
    this.allRoomUsers()
}

Room.prototype.startGame = function(){
    this.available = false;
    this.game.prepareGameSequance();
}

Room.prototype.deleteUser = function(user) {
    var deletedSitPos = this.availableSitPositions.find(a=>a.userid == user.id);
    deletedSitPos.userid = null;
    
    user.score = 0;
    this.users.splice(this.users.indexOf(user),1);
    this.userCount = this.users.length;
    user.leave(this.id);

    this.io.to(this.id).emit("userLeaveRoom",user.indexnumber);


    // TODO: UserCount 0'sa this.users[0].score undefined oluyor
    if((this.userCount < 2 && this.game.gameStarted)){
        this.users[0].score = 0;
        this.closeRoom();
    }

    if(this.userCount != this.maxUserCount && !this.game.gameStarted){
        this.available = true;
    }
 
    this.allRoomUsers()
}

Room.prototype.closeRoom = function(){
    this.game.resetEveryThink();
    this.io.to(this.id).emit("noOneLeftInRoom");
    this.io.in(this.id).socketsLeave(this.id);
    var index = global.allRooms.indexOf(this);        
    global.allRooms.splice(index,1);
}


Room.prototype.allRoomUsers = function() {
    var users = [];
    this.users.map(key =>{
        var userSitPos = this.availableSitPositions.find(a => a.userid == key.id);
        users.push({name:key.name,indexnumber:key.indexnumber,score:key.score,sitposition:userSitPos.sitposition,pawnid:key.pawnid})
    })
    
    this.io.in(this.id).emit('allRoomUsers', users);
}


module.exports = Room