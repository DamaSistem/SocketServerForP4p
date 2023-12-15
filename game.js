var Times = require('./gameVariables.js');
var {selectRandomQuestions} = require('./questions.js');
var {randomNegorPos} = require('./helper.js');

var Game = function(room) {
	this.room = room;
	this.io = room.io;
	this.timeVars = new Times();
	this.id = room.id;
	this.turnUserIndex = 0;
	this.gameStarted = false;
	this.answers = [];
	this.whoisTurn ={};
	this.streetCardDeck =[];
	this.userHand = [];
	this.streetCardIndex = 0;
	this.gameOver = false;
	this.winner = "";
}
Game.prototype.createDeck = function(){
	for (var i = 0; i < 59; i++) {
		this.streetCardDeck[i]=i;
	}
	this.io.to(this.id).emit('createDeck')
}
Game.prototype.shuffleDeck = function() {
	
 	let currentIndex = this.streetCardDeck.length,  randomIndex;

	// While there remain elements to shuffle.
	while (currentIndex > 0) {

		// Pick a remaining element.
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[this.streetCardDeck[currentIndex], this.streetCardDeck[randomIndex]] = [
		  this.streetCardDeck[randomIndex], this.streetCardDeck[currentIndex]];
	}
	console.log(this.streetCardDeck);
}

Game.prototype.waitForGameStart = function() {
	
	return new Promise((resolve, reject) => {
		const intervalGameStart = setInterval(()=>{
			this.io.to(this.id).emit('countDownGameStart',this.timeVars.waitingTime)
			this.timeVars.waitingTime--;
			console.log('waitForGameStart',this.timeVars.waitingTime)
			if(this.timeVars.waitingTime <= -1){
				this.io.to(this.id).emit('countDownGameStartFinished')

				clearInterval(intervalGameStart);
				resolve();
			}
		}, 1000); 
  	});
}

Game.prototype.deleteCard = function(cardIndex,user){
	user.hand = user.hand.filter(function(element) {
		return element !== cardIndex;
	});
	this.io.to(this.id).emit("usersDeleteCard",{userId:user.indexnumber,streetCardId:cardIndex});
}

Game.prototype.addCard = function(cardIndex,user) {
	user.hand.push(cardIndex);
	
	this.io.to(this.id).emit("usersCards",{userId:user.indexnumber,streetCardId:cardIndex});
	this.io.to(user.id).emit("drawCard",cardIndex);
	this.CheckDeckisEmpty();
}

Game.prototype.gameTime = function() {
	var turnUser = this.whichUserTurn();
	this.whoisTurn = turnUser;
	this.io.to(this.id).emit("whoisTurn",{turnUserName:turnUser.name,turnUserIndex:turnUser.indexnumber});
	this.io.to(this.id).emit('countDownMax',this.timeVars.gameTimeMax)
	return new Promise((resolve, reject) => {
		const intervalTimer = setInterval(()=>{
			this.io.to(this.id).emit('countDown',this.timeVars.gameTime)
			
			console.log("countDown",this.timeVars.gameTime)
			this.timeVars.gameTime--;
			//console.log('gameTime',this.timeVars.gameTime)
			if(this.timeVars.gameTime <= -1){
				this.io.to(this.id).emit('gameTimeOver')
				clearInterval(intervalTimer);
				resolve();
			}
		}, 1000);
	});
}

Game.prototype.waitForTurnFinish = function(){
	this.io.to(this.id).emit('disgardingSequance');
	return new Promise((resolve, reject) => {

		const waitAfterTurnFinish = setInterval(()=>{

			this.io.to(this.id).emit('waitAfterTurnFinish',this.timeVars.waitAfterTurnFinish);
			this.io.to(this.id).emit('waitAfterTurnFinishMax',this.timeVars.waitAfterTurnFinishMax);
			this.timeVars.waitAfterTurnFinish--;
			console.log('waitAfterTurnFinish',this.timeVars.waitAfterTurnFinish)
			if(this.timeVars.waitAfterTurnFinish <= -1){
			
				clearInterval(waitAfterTurnFinish);
				resolve();
			}
		}, 1000); 
  	});
}

Game.prototype.drawCard = function(user) {
	user.hand.push(this.streetCardDeck[0]);
	this.io.to(user.id).emit("drawCard",this.streetCardDeck[0]);
	this.io.to(this.id).emit("usersCards",{userId:user.indexnumber,streetCardId:this.streetCardDeck[0]});
	this.streetCardDeck.shift();
	console.log(this.streetCardDeck);
	this.CheckDeckisEmpty();
}
Game.prototype.dealCard = function(user,playerNumberofCard) {
	for (var i = 0; i < playerNumberofCard; i++) {
		this.drawCard(user)
	}
	
}
Game.prototype.CheckDeckisEmpty = function(user,playerNumberofCard) {
	if(this.streetCardDeck.length == 0){
		var playerHandCards = [];
		for (var i = 0; i < this.room.users.length; i++) {
			playerHandCards = playerHandCards.concat(this.room.users[i].hand);
		}

		for (var i = 0; i < 59; i++) {
			this.streetCardDeck[i]=i;
		}
		this.shuffleDeck();

		this.streetCardDeck = this.streetCardDeck.filter( function( el ) {
		  return !playerHandCards.includes( el );
		} );

		this.io.to(this.id).emit("renewDeck",this.streetCardDeck);
	}
	
}

Game.prototype.waitForUserCompliteTheHand = function() {
	var currentUser = this.room.users[this.turnUserIndex];
	var handCount = currentUser.hand.length;
	for (var i = handCount; i < 5; i++) {
		
		this.drawCard(currentUser)
	}
	
}
Game.prototype.waitForDealCards = function(){
	var playerNumber = this.room.users.length;
	var cardNumber;
    if (playerNumber === 2) {
        cardNumber = [4, 5];
    } else if (playerNumber === 3) {
        cardNumber = [4, 5, 6];
    } else if (playerNumber === 4) {
        cardNumber = [4, 5, 5, 6];
    } else if (playerNumber === 5) {
        cardNumber = [4, 5, 5, 5, 6];
    } else {
        console.log("Geçersiz oyuncu sayısı");
        return;
    }
	for (var i = 0; i < playerNumber; i++) {
		
		this.dealCard(this.room.users[i],cardNumber[i]);
	}

	return new Promise((resolve, reject) => {

		const dealDeckTime = setInterval(()=>{

			this.io.to(this.id).emit('countDowndealDeckTime',this.timeVars.dealDeckTime);
			this.timeVars.dealDeckTime--;
			console.log('countDowndealDeckTime',this.timeVars.dealDeckTime)
			if(this.timeVars.dealDeckTime <= -1){
			
				clearInterval(dealDeckTime);
				resolve();
			}
		}, 1000); 
  	});
}

Game.prototype.gameTimeFinish = function() { this.timeVars.gameTime = 0; }
Game.prototype.afterTurnTimeFinish = function() { this.timeVars.waitAfterTurnFinish = 0; }
Game.prototype.dealDeckTimeFinish = function() { this.timeVars.dealDeckTime = 0; }
Game.prototype.playAgainFinish = function() { this.timeVars.waitPlayAgain = 0; }

Game.prototype.prepareGameSequance = async function() {
	
	this.gameStarted = true;
	this.gameOver = false;
	this.timeVars = new Times();
	this.createDeck();
	this.shuffleDeck();
	this.waitForGameStart()
	.then(result=>this.waitForDealCards())
	.then(result=>this.startGameSequance())
	
	this.io.to(this.id).emit("gameStarted",this.gameStarted);
}

Game.prototype.resetEveryThink = function(){
	console.log("Reset Everything")
	this.timeVars.waitingTime = 0;
	this.timeVars.gameTime = 0;
	this.timeVars.waitAfterTurnFinish = 0;
	this.timeVars.waitPlayAgain = 0;
	this.turnUserIndex = 0;
	this.gameStarted = false;
	this.gameOver = true;
}

Game.prototype.startGameSequance = function() {
	this.gameTime()
	.then(result=>this.waitForTurnFinish())
	.then(result=>this.waitForUserCompliteTheHand())
	.then(()=>{ this.TurnControl() });
}

Game.prototype.whichUserTurn = function(){
	return this.room.users[this.turnUserIndex];
}

Game.prototype.gameisOver = function(name){
	this.gameOver = true;
	this.winner = name;
	this.timeVars.gameTime = 0;
	this.timeVars.waitAfterTurnFinish = 0;
}

Game.prototype.TurnControl = function() {
	const getNextUser = () => {
        this.turnUserIndex = this.turnUserIndex < this.room.users.length-1 ? this.turnUserIndex+1: 0;
		return this.room.users[this.turnUserIndex];        
    }

    let nextUser = getNextUser();
    /*this.timeVars = new Times();
	this.startGameSequance();*/
	if(!this.gameOver){
		setTimeout(()=>{
			this.timeVars = new Times();
			this.startGameSequance();
		},2000)
	}else{
		this.io.to(this.id).emit("gameOver",this.winner);
    	this.startGameOverSequance();
	}
	
    /*let howManyUserFinished = 0;
    
    for(var i = 0; i < this.room.users.length;i++){
    	if(nextUser.isFinished){
    		howManyUserFinished++;
    		nextUser = getNextUser();
    	}else{
    		if(this.room.users.length > 1){
    			setTimeout(()=>{
					this.timeVars = new Times();
	    			this.startGameSequance();
    			},4000)
    		
    		}
    		
    		break;
    	}
    }

    if(howManyUserFinished == this.room.users.length){
    	this.io.to(this.id).emit("gameOver");
    	this.startGameOverSequance();
    }*/
}


Game.prototype.startGameOverSequance = function(){
	/*var winner = this.room.users.reduce((prev, current) =>
    ( prev.score > current.score) ? prev : current )

	this.io.to(this.id).emit("gameOverWinner",winner.name);*/
	this.waitForPlayAgain();
}


Game.prototype.totalScore = function(){
	this.room.users.map((user)=>{
		this.io.to(this.id).emit("score",{userindex:user.indexnumber,score:user.score})
	})
}


/*Game.prototype.gameOver = function(data){
	var winner = this.room.users.reduce((prev, current) =>
    ( prev.score > current.score) ? prev : current )

    var gameOverWinner = {winnerName:winner.name,winnerScore:winner.score,winnerText:winner.text,chairmanText:data}
	this.io.to(this.id).emit("gameOver",gameOverWinner);
	this.waitForPlayAgain();
}*/

Game.prototype.waitForPlayAgain = function() {
	this.room.users.map(key =>{
		key.isFinished = false;
		key.readyPlayAgain = false;
		key.score = 0;
	})
	this.gameStarted = false;
	return new Promise((resolve, reject) => {
		const intervalPlayAgain = setInterval(()=>{
			this.io.to(this.id).emit('countDownPlayAgain',this.timeVars.waitPlayAgain)
			this.timeVars.waitPlayAgain--;
			console.log('waitForPlayAgain',this.timeVars.waitPlayAgain)
			if(this.timeVars.waitPlayAgain <= -1){

				this.timeVars = new Times();
				this.turnUserIndex = 0;
				this.room.playAgainCount = 0;
				this.streetCardDeck =[];
				this.streetCardIndex = 0;
				var connectedUserCount = 0;
				var tempUserId = [];

				this.room.users.map((key,index) =>{
					if(!key.readyPlayAgain){
						tempUserId.push(key.id);
					}else{
						connectedUserCount++;
						var sitPos = this.room.availableSitPositions.find(a => a.userid == key.id);
					this.io.to(key.id).emit("sitPosition",sitPos.sitposition);
					}

					
				})

				if(tempUserId.length != 0){
					tempUserId.map(key =>{
						var disconnectUser = this.room.users.filter(user=>user.id == key)[0];
						this.room.deleteUser(disconnectUser);
					})
				}

				if(this.room.userCount < this.room.maxUserCount){
					//this.room.startGame();
					this.io.to(this.id).emit("playAgainStarted");
					this.room.allRoomUsers();
					this.room.available = true;
				}else{
					
					this.io.to(this.id).emit("playAgainStarted");
					this.room.allRoomUsers();
					this.room.available = false;
					this.room.startGame();
				}
				clearInterval(intervalPlayAgain);
				resolve();
			}
		}, 1000); 
  	});
}

module.exports = Game