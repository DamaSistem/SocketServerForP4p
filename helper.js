function PromiseFunction(time,game,socketEmitName,fun=()=>{}){
	fun();
	return new Promise((resolve,reject) =>{
		const interval = setInterval(()=>{
			game.io.to(game.id).emit(socketEmitName,time)
			time--;
			console.log('promise',time)
			if(time <= -1){
				clearInterval(interval);
				resolve();
			}
		}, 1000)
	})
}

const s4 = () => (Math.random() + 1).toString(36).substring(8)

const s4Create = () => s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

const randomNegorPos = () => {
	var random = 1 + Math.floor(Math.random() * (1 - 1 + 1));

	var negorpos = Math.random() < 0.5 ? -1 : 1;

	return random*negorpos;
}

module.exports = {PromiseFunction,s4Create,randomNegorPos}