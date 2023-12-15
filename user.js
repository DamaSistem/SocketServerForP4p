class User{
	constructor({ready =false,readyPlayAgain=false,name,indexnumber,score=0,pawnid,socket}){
		this.ready = ready;
		this.readyPlayAgain = readyPlayAgain;
		this.name = name;
		this.indexnumber = indexnumber;
		this.score = score;
		this.pawnid = pawnid;
		this.socket = socket;
	}
	get setscore () {
		this.score = 5;
	}

}

module.exports = User;