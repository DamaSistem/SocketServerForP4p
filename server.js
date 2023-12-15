//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var express = require('express');
var app = express();
//var https = require('https');
var https = require('http');
var fs = require('fs');
var room = require('./room.js');
var Game = require('./game.js');
var User = require('./user.js');
var {SelectQuestionWithType} = require('./questions.js');

var mysql = require('mysql');
/*function read(f) {return fs.readFileSync(f).toString();}
function include(f) {eval.apply(global, [read(f)]);}*/

/*var pkey = fs.readFileSync('/etc/letsencrypt/live/s1.damasistem.com/privkey.pem');
var pcert = fs.readFileSync('/etc/letsencrypt/live/s1.damasistem.com/fullchain.pem');*/

var SERVER_PORT = 3004;
var options = {
    hostname: 'https://s1.damasistem.com',
    port: SERVER_PORT,  
   /* key: pkey, 
    cert: pcert,
    requestCert: true,*/
    rejectUnauthorized: false, 
};

var server = https.createServer(options, app).listen(SERVER_PORT, function(){
  console.log("Express server listening on port " + SERVER_PORT);
});  

//var server = require('https').Server(app)
var io = require('socket.io')(server);

connections = [];
global.allRooms = [];
currentQuestion = "";
swapCard ="";

const PORT = process.env.PORT || SERVER_PORT;
app.get('/', function (req, res){
	res.sendFile(__dirname + '/index.html');
});

io.on('connect', function (socket) {
	
	var userAuth = JSON.parse(socket.handshake.query.auth)
	socket.readyPlayAgain = false;
	socket.name = userAuth.name;
	socket.indexnumber = userAuth.indexnumber;
	socket.score = 0;
	socket.isFinished = false;
	socket.hand = [];
 	connections.push(socket);

	console.log('Connected: %s kadar kişi bağlı',connections.length);

	socket.on('disconnect',function(data){
		
		socket.score = 0;
		connections.splice(connections.indexOf(socket),1);
		var currentRoom = global.findCurrentRoom(socket);

		if (currentRoom != undefined){

			currentRoom.deleteUser(socket);

			if(currentRoom.users.length == 0 ){
				io.in(currentRoom.id).emit('allRoomUsers', JSON.stringify([]));
				var index = global.allRooms.indexOf(currentRoom);
				currentRoom.game.resetEveryThink();
				io.in(currentRoom.id).socketsLeave(currentRoom.id);
				global.allRooms.splice(index,1);
				
			}
		}
		
		console.log('Disconnected: %s kadar kişi bağlı',connections.length);
	});

	socket.on('joiningRoom',function(vs){
 			
		var roomCapacity = vs;
		var availableRooms = allRooms.filter(room => room.available && room.maxUserCount == roomCapacity)

		var userinRoom = allRooms.filter(room=>{
				for (var i = 0; i < room.users.length; i++) {
					if (room.users[i].indexnumber == socket.indexnumber)
				      return true;
				  }
				  return false;
			})
			
		if(userinRoom.length == 0){
			if(availableRooms.length == 0){
				createRoom(socket,io,roomCapacity)
			}else{
				joinRoom(socket,availableRooms[0],roomCapacity)
			}
		}

	});


	socket.on('pawnid',function(pawnid){
		socket.pawnid = pawnid;
	});
	socket.on('endTurn',function(){
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom?.game.gameTimeFinish();
	});
	socket.on('endDisgarding',function(){
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom?.game.afterTurnTimeFinish();
	});

	socket.on('userCollectedBin',function(data){
		var currentRoom = global.findCurrentRoom(socket);
		socket.broadcast.emit('userCollectedBin', data);
	});

	socket.on('StealCard',function(stealingCard){
		var currentRoom = global.findCurrentRoom(socket);

		var stealingUser = global.findUserByIndex(stealingCard.stealingUserId);
		var currentUser = global.findUserByIndex(stealingCard.userId);

		currentRoom.game.deleteCard(stealingCard.streetCardId,stealingUser)
		io.to(stealingUser.id).emit("someOneStealCard",stealingCard.streetCardId)
		currentRoom.game.addCard(stealingCard.streetCardId,currentUser)
		io.to(currentUser.id).emit('cardAdded')
	});

	socket.on('AskForCard',function(stealingCard){
		var currentRoom = global.findCurrentRoom(socket);

		var stealingUser = global.findUserByIndex(stealingCard.stealingUserId);
		var currentUser = global.findUserByIndex(stealingCard.userId);

		currentRoom.game.deleteCard(stealingCard.streetCardId,stealingUser)
		io.to(stealingUser.id).emit("someOneStealCard",stealingCard.streetCardId)
		currentRoom.game.addCard(stealingCard.streetCardId,currentUser)
		io.to(currentUser.id).emit('cardAdded')
	});

	socket.on('swapCard1',function(stealingCard){
		var currentRoom = global.findCurrentRoom(socket);

		var stealingUser = global.findUserByIndex(stealingCard.stealingUserId);
		var currentUser = global.findUserByIndex(stealingCard.userId);
		swapCard = stealingCard;
		io.to(stealingUser.id).emit("swapCardSecondTurn",currentUser.indexnumber )
		/*currentRoom.game.deleteCard(stealingCard.streetCardId,stealingUser)
		io.to(stealingUser.id).emit("someOneStealCard",stealingCard.streetCardId)

		currentRoom.game.addCard(stealingCard.streetCardId,currentUser)
		io.to(currentUser.id).emit('cardAdded')*/

	});

	socket.on('swapCard2',function(cardid){
		var currentRoom = global.findCurrentRoom(socket);

		var stealingUser = global.findUserByIndex(swapCard.stealingUserId);
		var currentUser = global.findUserByIndex(swapCard.userId);
		
		currentRoom.game.deleteCard(swapCard.streetCardId,stealingUser)
		io.to(stealingUser.id).emit("someOneStealCard",swapCard.streetCardId)

		currentRoom.game.addCard(swapCard.streetCardId,currentUser)
		io.to(currentUser.id).emit('cardAdded')

		currentRoom.game.deleteCard(cardid,currentUser)
		io.to(currentUser.id).emit("someOneStealCard",cardid)

		currentRoom.game.addCard(cardid,stealingUser)
		io.to(stealingUser.id).emit('cardAdded')

	});

	socket.on('deletingCard',function(cardIndex){
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom.game.deleteCard(cardIndex,socket)
	});

	socket.on('drawCardwithId',function(cardIndex){
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom.game.addCard(cardIndex,socket)
	});

	socket.on('drawCard',function(cardIndex){
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom?.game.drawCard(socket)
	});

	socket.on('roadDataIndex',function(roadData){
		var currentRoom = global.findCurrentRoom(socket);
		io.in(currentRoom.id).emit('roadDataIndex',roadData)
	});

	socket.on('effectOnRoad',function(tokenData){
		var currentRoom = global.findCurrentRoom(socket);
		io.in(currentRoom.id).emit('effectOnRoad',tokenData)
	});


	socket.on('leaveRoom',function(){ 
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom?.deleteUser(socket)
	});

	socket.on('createRoom',function(){
		createRoom(socket,io,true);
	})

	socket.on('gameOver',function(name){
		
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom?.game.gameisOver(name);
	})
 
	socket.on('startGame',function(){
		var currentRoom = global.findCurrentRoom(socket);
		if(currentRoom != undefined){
			if(currentRoom.areAllUsersReady()){
				if(currentRoom.roomMinUserSet()){
					io.in(currentRoom.id).emit('gameStarting')
					currentRoom.startGame()
				}else{
					io.to(socket.id).emit("minUserNotSet");
				}
			}else
				io.to(socket.id).emit("notAllReady");
		}
	})	

	socket.on('playAgain',function(){ 
		socket.readyPlayAgain = true;
		var currentRoom = global.findCurrentRoom(socket);
		currentRoom.playAgainCount++;
		if(currentRoom.playAgainCount == currentRoom.userCount){
			currentRoom.game.playAgainFinish();
		}
	});

});

global.findUserByIndex = (userIndex) => connections.find((con) => con.indexnumber == userIndex);

global.findCurrentRoom = (socket) => global.allRooms.filter(room =>
		room.users.find(user=>user.id == socket.id))[0];

global.findRoomByIndex = (roomId) => global.allRooms.find(room =>
		room.id == roomId);

var createRoom = (socket,io,roomCapacity) => {
	var newRoom = new room(io,roomCapacity);
	socket.join(newRoom.id);
	socket.room = newRoom.id;

	newRoom.addUser(socket)

	allRooms.push(newRoom)
}

var joinRoom = (socket,availableRoom) => {
	socket.join(availableRoom.id);
	socket.room = availableRoom.id;
	availableRoom.addUser(socket)
}
var joinRoomWithId = (socket,roomId) => {
	socket.join(roomId);
	var room = global.findRoomByIndex(roomId);
	socket.room = room;
	room.addUser(socket)
}