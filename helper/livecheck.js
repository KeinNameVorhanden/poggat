const streamdata = require('./streamdata');

async function LiveChecker(who, client_id, api_auth_key) {
    try {
        console.log(`[${'!'.brightYellow}] Checking if ${who.brightMagenta} is online!`);
        const api_data = await streamdata.getData(who, client_id, api_auth_key);
  
        if (api_data.length == 0) {
			console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
			return false
        }
  
        let live = await api_data["is_live"], live_game, is_game, stream_title
        if (live) {
			live_game = await api_data["game_name"];
            stream_title = await api_data[""]
			is_game = (live_game.toUpperCase() == game1.toUpperCase() || live_game.toUpperCase() == game2.toUpperCase() || live_game.toUpperCase() == game3.toUpperCase())
        } else {
			console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
			return false
        }
  
        if (live && is_game) {
			console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${live_game.brightGreen}!`);
			return true
        } else if (live && !is_game) {
			if (streamheroes.includes(who)) {
				console.log(`[${'i'.brightCyan}] Stream-Hero ${who.brightMagenta} is ${'online'.brightGreen}!`);
				return true
			} else {
				console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${live_game.brightYellow}!`);
				return false
			}
        }
    } catch(e) {
        throw e;
    }
}

exports.isLiveCheck = LiveChecker;