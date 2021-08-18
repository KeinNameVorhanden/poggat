// imports
require('dotenv').config();
let fs = require('fs');
let readline = require('readline');
let treekill = require('tree-kill');
let DayJS = require('DayJS');
let puppeteer = require('puppeteer-core');
let cheerio = require('cheerio');
let ConsoleTitle = require('console-title');
let colors = require('colors');
let streamdata = require('./helper/streamdata');

// current version
let appversion = "0.3.4.5";
var logged_in_as = "";

let config = './config.json';
let base_url = 'https://www.twitch.tv/';
let user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36';
let old_user_agent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';

let scroll_delay = 2000;
let scroll_times = 2;
let streamer_list_refresh = 1;
let streamer_list_refresh_unit = 'hour';
let browser_clean = 1;
let browser_clean_unit = 'hour';

var run = true;
var first_run = true;
var streamers = null;
var collected_drops = 0;
var last_drop = "Never";
var api_auth_key = null;

let cfg = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config, 'utf8')) : null;
if (cfg) {
	fs.writeFile(config + '.bak', JSON.stringify(cfg, null, "\t"), function (err) {
		if (err) console.log(err)
	});
}

// config values
let browser_config, loc_cookie, auth_cookie
let exec_path, headless, proxy_server, proxy_auth, auth_token, country_code, game1, game2, game3, to_watch, streamheroes, client_id, client_secret, inactivity_sleep, min_watchtime, max_watchtime, only_idle_fixed, get_random_stream, get_streamhero_stream, new_watch_method, new_watch_idle
async function UpdateConfigValues() {
	let cfg = fs.existsSync(config) ? await JSON.parse(fs.readFileSync(config, 'utf8')) : null;
	if (!cfg) return
	// browser
	exec_path = cfg.browser.exec_path ? cfg.browser.exec_path : null;
	headless = cfg.browser.headless != null ? cfg.browser.headless : true;
	proxy_server = cfg.browser.proxy_server ? cfg.browser.proxy_server : ""; 
	proxy_auth = cfg.browser.proxy_auth ? cfg.browser.proxy_auth : ""; 

	// cookie
	auth_token = cfg.cookie.auth_token ? cfg.cookie.auth_token : null;
	country_code = cfg.cookie.country_code ? cfg.cookie.country_code : "GB";

	// twitch
	game1 = cfg.twitch.game1 ? cfg.twitch.game1 : "";
	game2 = cfg.twitch.game2 ? cfg.twitch.game2 : "";
	game3 = cfg.twitch.game3 ? cfg.twitch.game3 : "";
	to_watch = cfg.twitch.to_watch ? cfg.twitch.to_watch : null;
	streamheroes = cfg.twitch.streamheroes ? cfg.twitch.streamheroes : null;
	
	// api
	client_id = cfg.api.client_id ? cfg.api.client_id : null;
	client_secret = cfg.api.client_secret ? cfg.api.client_secret : null;

	// misc
    inactivity_sleep = !isNaN(cfg.misc.inactivity_sleep) ? cfg.misc.inactivity_sleep : 20;
	min_watchtime = !isNaN(cfg.misc.min_watchtime) ? cfg.misc.min_watchtime : 15;
	max_watchtime = !isNaN(cfg.misc.max_watchtime) ? cfg.misc.max_watchtime : 20;
	only_idle_fixed = cfg.misc.only_idle_fixed ? cfg.misc.only_idle_fixed : false;
	get_random_stream = cfg.misc.get_random_stream ? cfg.misc.get_random_stream : true;
	get_streamhero_stream = cfg.misc.get_streamhero_stream ? cfg.misc.get_streamhero_stream : false;
    new_watch_method = cfg.misc.new_watch_method ? cfg.misc.new_watch_method : true;
    new_watch_idle = !isNaN(cfg.misc.new_watch_idle) ? cfg.misc.new_watch_idle : 5;

    browser_config = {
        "headless": headless,
        "defaultViewport": null,
        "ignoreHTTPSErrors": true,
        "executablePath": exec_path,
        "args": [
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            `--window-size=1320,1080`,
            '--no-zygote',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    };
    
    loc_cookie = [{
        "domain": ".twitch.tv",
        "hostOnly": false,
        "httpOnly": false,
        "name": "twitch.lohp.countryCode",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": false,
        "session": false,
        "storeId": "0",
        "id": 1,
        "value": country_code
    }];
      
    auth_cookie =  [{
        "domain": ".twitch.tv",
        "hostOnly": false,
        "httpOnly": false,
        "name": "auth-token",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": "0",
        "id": 1,
        "value": auth_token
    }];
}
UpdateConfigValues();

let priceUpdateQueryEN = 'button[aria-label="Dismiss promo message"]';
let priceUpdateQueryDE = 'button[aria-label="Aktionsnachricht ausblenden"]';
let cookiePolicyQuery = 'button[data-a-target="consent-banner-accept"]';
let cookiePolicyQuery2 = 'button[data-a-target="player-overlay-mature-accept"]';
let matureContentQuery = 'button[data-a-target="player-overlay-mature-accept"]';
let sidebarQuery = '*[data-test-selector="user-menu__toggle"]';
let userStatusQuery = 'span[data-a-target="presence-text"]';
let channelsQuery = 'a[data-test-selector*="ChannelLink"]';
let streamPauseQuery = 'button[data-a-target="player-play-pause-button"]';
let closeNotificationQuery = 'button[aria-label="Close"]';
let streamSettingsQuery = '[data-a-target="player-settings-button"]';
let streamQualitySettingQuery = '[data-a-target="player-settings-menu-item-quality"]';
let streamQualityQuery = 'input[data-a-target="tw-radio"]';
let categoryNotFoundQuery = '[data-a-target="core-error-message"]';
let dropButtonQuery = 'button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]';
let dropClaimedQuery = 'p[data-test-selector="drops-message-bar-title"]';
let chatClaimQuery = '[data-test-selector="tw-core-button-label-text"]';



// spawn browser with predefined configuration
async function SpawnBrowser() {
    if (first_run) {console.log(`\n[${'●'.brightRed}] ${'BROWSER'.brightRed}`)}

    await UpdateConfigValues();
  
	try {
		var browser = await puppeteer.launch(browser_config);
		var page = await browser.newPage();
  
		await page.setUserAgent(user_agent);
		await page.setCookie(...auth_cookie);
		await page.setCookie(...loc_cookie);
  
		page.setDefaultNavigationTimeout(0);
		page.setDefaultTimeout(0);
  
		if (proxy_auth) {
			await page.setExtraHTTPHeaders({
				'Proxy-Authorization': 'Basic ' + Buffer.from(proxy_auth).toString('base64')
			})
		}
		console.log(`[${'+'.brightGreen}] Successfully set up the browser.`);
	} catch (e) {
		Exit("set up the browser", e);
	}
  
	return {
		browser,
		page
	};
}

// Idle for x ms
function Idle(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function GetQuery(page, GetQuery) {
	let bodyHTML = await page.evaluate(() => document.body.innerHTML);
	let $ = cheerio.load(bodyHTML);
	let jquery = $(GetQuery);
	
	return jquery;
}

async function GetUserProperty(page, name) {
	if (!name || !(/^[A-Za-z1-9]+$/.test(name))) throw new Error("Invalid cookie name: ", name);
  
	let data = await page.cookies();
	let cookieValue = undefined;
  
	for (let i = 0; i < data.length; i++) {
		if (data[i].name == 'twilight-user') {
			cookieValue = JSON.parse(decodeURIComponent(data[i].value));
			if (!cookieValue[name]) throw new Error("Invalid cookie value returned");
		}
	}
	return cookieValue[name];
}

// if cookie 'twilight-user' exists, print username, if not set cookie again
async function CheckLogin(page) {
    let cookieSetByServer = await page.cookies();
    for (var i = 0; i < cookieSetByServer.length; i++) {
        if (cookieSetByServer[i].name == 'twilight-user') {
            let name = await GetUserProperty(page, 'displayName');
            if (first_run) {
            console.log(`[${'+'.brightGreen}] Successfully logged in as ${name.bold.green}!`);
            logged_in_as = name;
        }
        return true;
      }
    }
  
    auth_cookie.value = auth_token;
    await Idle(250);
    CheckLogin(page);
}

async function LiveChecker(who, silent) {
    try {
        if (!silent) console.log(`[${'!'.brightYellow}] Checking if ${who.brightMagenta} is online!`);
        let api_data = await streamdata.getData(who, client_id, api_auth_key);
  
        if (api_data.length == 0) {
			if (!silent) console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
			return false
        }
  
        let live = await api_data["is_live"], live_game, is_game, stream_title, is_rerun
        if (live) {
			live_game = await api_data["game_name"];
            stream_title = await api_data["title"].toLowerCase();
            is_rerun = await (stream_title.includes("rerun") || stream_title.includes("re-run") || stream_title.includes("restream") || stream_title.includes("re-stream"));
			is_game = (live_game.toUpperCase() == game1.toUpperCase() || live_game.toUpperCase() == game2.toUpperCase() || live_game.toUpperCase() == game3.toUpperCase())
        } else {
			if (!silent) console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
			return false
        }
  
        if (live && is_game && !is_rerun) {
			if (!silent) console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${live_game.brightGreen}!`);
			return true
        } else if (live && !is_game && !is_rerun) {
			if (streamheroes.includes(who)) {
				if (!silent) console.log(`[${'i'.brightCyan}] Stream-Hero ${who.brightMagenta} is ${'online'.brightGreen}!`);
				return true
			} else {
				if (!silent) console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${live_game.brightYellow}!`);
				return false
			}
        }
    } catch(e) {
        throw e;
    }
}

async function GetAllStreamer(page) {
    try {
        streamers = null;
        streamers = new Array();

        if (game1 != "") {
            await page.goto(`https://www.twitch.tv/directory/game/` + game1.toUpperCase() + "?tl=c2542d6d-cd10-4532-919b-3d19f30a768b", {
                "waitUntil": "networkidle0"
            });
        
            let notFound = await GetQuery(page, categoryNotFoundQuery);
            if (notFound.length || notFound.text() == "Category does not exist") {
                console.log(`[${'-'.brightRed}] Game category not found, did you enter the game as displayed on twitch?`);
                Exit();
            }
        
            await Scroll(page, scroll_times);
            let jquery = await GetQuery(page, channelsQuery);
    
            for (var i = 0; i < jquery.length; i++) {
                streamers[i] = jquery[i].attribs.href.split("/")[1];
            }
            if (streamers.length > 0) {
                console.log(`[${'+'.brightGreen}] Got streamers for ${game1.brightCyan} and filtered them!`);
            } else {
                console.log(`[${'!'.brightRed}] No streamer found for ${game1.brightCyan}!`);
                await Idle(50);
                if (game2 != "") {
                    await page.goto(`https://www.twitch.tv/directory/game/` + game2.toUpperCase() + "?tl=c2542d6d-cd10-4532-919b-3d19f30a768b", {
                    "waitUntil": "networkidle0"
                    });
            
                    let notFound = await GetQuery(page, categoryNotFoundQuery);
                    if (notFound.length || notFound.text() == "Category does not exist") {
                        console.log(`[${'-'.brightRed}] Game category not found, did you enter the game as displayed on twitch?`);
                        Exit();
                    }
                
                    await Scroll(page, scroll_times);
                    let jquery = await GetQuery(page, channelsQuery);
            
                    for (var i = 0; i < jquery.length; i++) {
                        streamers[i] = jquery[i].attribs.href.split("/")[1];
                    }
                    if (streamers.length > 0) {
                        console.log(`[${'+'.brightGreen}] Got streamers for ${game2.brightCyan} and filtered them!`);
                    } else {
                        console.log(`[${'!'.brightRed}] No streamer found for ${game2.brightCyan}!`);
                        await Idle(50);
                        if (game3 != "") {
                            await page.goto(`https://www.twitch.tv/directory/game/` + game3.toUpperCase() + "?tl=c2542d6d-cd10-4532-919b-3d19f30a768b", {
                            "waitUntil": "networkidle0"
                            });
                                
                            let notFound = await GetQuery(page, categoryNotFoundQuery);
                            if (notFound.length || notFound.text() == "Category does not exist") {
                                console.log(`[${'-'.brightRed}] Game category not found, did you enter the game as displayed on twitch?`);
                                Exit();
                            }
                                
                            await Scroll(page, scroll_times);
                            let jquery = await GetQuery(page, channelsQuery);
                            
                            for (var i = 0; i < jquery.length; i++) {
                                streamers[i] = jquery[i].attribs.href.split("/")[1];
                            }
                            if (streamers.length > 0) {
                                console.log(`[${'+'.brightGreen}] Got streamers for ${game3.brightCyan} and filtered them!`);
                            } else {
                                console.log(`[${'!'.brightRed}] No streamer found for ${game3.brightCyan}!`);
                            }
                        }
                    }
                }
            }
        }
        return;
    } catch (e) {
        Exit("get streamers/filter streamer.", e);
    }
}

async function WatchStream(browser, page) {
	console.log(`\n[${'●'.brightRed}] ${'MAIN'.brightRed}`);
	var streamerLastRefresh = DayJS().add(streamer_list_refresh, streamer_list_refresh_unit);
	var browserLastRefresh = DayJS().add(browser_clean, browser_clean_unit);
  
	await CheckLogin(page);
	while (run) {
		try {
            await UpdateConfigValues();
            await Idle(75);
            await ClaimDrops(page);

            if (api_auth_key == null) {
                api_auth_key = await streamdata.getKey(client_id, client_secret);
            }
		
            let watch = null;
            if (to_watch.length > 0) {
                for (var i = 0; i < to_watch.length; i++) {
                    let isLive = await LiveChecker(to_watch[i], false)
                    if (isLive) {
                        watch = to_watch[i];
                        break;
                    }
                    watch = null;
                }
            }
		
            if (!only_idle_fixed) {
                if (watch == null || watch == undefined) {
                    /*if (DayJS(browserLastRefresh).isBefore(DayJS())) {
                        var newSpawn = await Cleanup(browser, page);
                        browser = newSpawn.browser;
                        page = newSpawn.page;
                        first_run = true;
                        browserLastRefresh = DayJS().add(browser_clean, browser_clean_unit);
                    }*/
        
                    if (get_random_stream) {
                        await GetAllStreamer(page);
                    
                        if (streamers.length > 0 && streamers.length != undefined) {
                            console.log(`[${'!'.brightYellow}] Getting random Streamer.`);
                            watch = streamers[GetRandomInt(0, streamers.length - 1)];
                            streamerLastRefresh = DayJS().add(streamer_list_refresh, streamer_list_refresh_unit);
                        }
                    }
        
                    if (get_streamhero_stream) {
                        if (watch == undefined && streamheroes.length > 0) {
                            console.log(`[${'!'.brightYellow}] Getting Stream Heroes Streamer.`);
                            for (var i = 0; i < streamheroes.length; i++) {
                                let isLive = await LiveChecker(streamheroes[i], false);
                                if (isLive) {
                                    watch = streamheroes[i];
                                    break;
                                }
                                watch = null;
                            }
                        }
                    }
                    console.log(`${('Switching to ' + watch).gray}`)
                    await page.goto(base_url + watch, { "waitUntil": "networkidle2" });
                }
            }
    
            if (!first_run) {
                await CheckLogin(page);
                ConsoleTitle(logged_in_as + " @ IdleTwitch v" + appversion + " | Drops collected: " + collected_drops + " | Last Drop: " + last_drop);
            } else {
                ConsoleTitle("NodeJS @ IdleTwitch v" + appversion + " | Drops collected: " + collected_drops + " | Last Drop: " + last_drop);
            }

            await Idle(50);
  
            if (watch != null) {
                await page.goto(base_url + watch, { "waitUntil": "networkidle2" });
    
                await Idle(125);
                await ClickWhenExist(page, priceUpdateQueryEN);
                await ClickWhenExist(page, priceUpdateQueryDE);
                await ClickWhenExist(page, cookiePolicyQuery);
                await ClickWhenExist(page, cookiePolicyQuery2);
                await ClickWhenExist(page, matureContentQuery);
    
                if (first_run) {
                    await ClickWhenExist(page, streamPauseQuery);
                    await ClickWhenExist(page, closeNotificationQuery);
                    await page.waitForSelector(streamSettingsQuery);
                    await ClickWhenExist(page, streamSettingsQuery);
                    await page.waitForSelector(streamQualitySettingQuery);
                    await ClickWhenExist(page, streamQualitySettingQuery);
                    await page.waitForSelector(streamQualityQuery);
                    await ClickWhenExist(page, closeNotificationQuery);
        
                    var resolution = await GetQuery(page, streamQualityQuery);
                    resolution = resolution[resolution.length - 1].attribs.id;
                    await page.evaluate((resolution) => { document.getElementById(resolution).click(); }, resolution);
                    console.log(`[${'!'.brightYellow}] Lowest resolution set!`);
        
                    await ClickWhenExist(page, closeNotificationQuery);
                    await ClickWhenExist(page, streamPauseQuery);
                    await page.keyboard.press('m');
                }
    
                await Idle(35);
                await page.keyboard.press('m');
                await Idle(35);
                await page.keyboard.press('m');
        
                await ClickWhenExist(page, sidebarQuery);
                await page.waitForSelector(userStatusQuery);
                let status = await GetQuery(page, userStatusQuery);
                await ClickWhenExist(page, sidebarQuery);
        
                let info;
                info = (`[${'i'.brightCyan}] Watching: ` + base_url + watch);
                //info = info + "\n" + `[${'i'.brightCyan}] Status: ` + (status[0] ? status[0].children[0].data : "Unknown");
                info = info + "\n" + (`[${'i'.brightCyan}] Time: ` + DayJS().format('HH:mm:ss') + ' => ' + DayJS().add((20), 'minutes').format('HH:mm:ss'));
        
                console.log(info);

                if (new_watch_method) {
                    let heartbeat, timestamp = DayJS()
                    while (watch) {
                        heartbeat = await LiveChecker(watch, true);
                        if (!heartbeat) {break}
                        if (DayJS().isAfter(timestamp.add(20, 'minute'))) {
                            console.log(`[${'i'.brightCyan}] Idled for 20 minutes.`);
                            break;
                        }
                        dropClaimedQuery = await ClickWhenExist(page, chatClaimQuery);
                        if (dropClaimedQuery) {
                            console.log(`[${'i'.brightCyan}] Claimed a drop.`);
                            collected_drops++;
                        }
                        await page.goto(base_url + watch, { "waitUntil": "networkidle2" });
                        await Idle(35);
                        await page.keyboard.press('m');
                        await Idle(35);
                        await page.keyboard.press('m');
                        await Idle(new_watch_idle*60000);
                    }
                    if (heartbeat !== null && heartbeat === false) console.log(`[${'i'.brightCyan}] Heartbeat failed`)
                }

                if (first_run) {
                    first_run = false;
                }
            } else {
                console.log(`[${'i'.brightCyan}] Idling for ` + inactivity_sleep + ' minutes => ' + DayJS().add((inactivity_sleep), 'minutes').format('HH:mm:ss') + '\n');
                await page.waitForTimeout(inactivity_sleep*60000);
            }
		
            if (!new_watch_method) await page.waitForTimeout(inactivity_sleep*60000);
        } catch (e) {
            Exit("trying to watch a stream.", e);
        }
	}
}

// scroll current page, for x {times} and for x {scroll_delay} ms
async function Scroll(page, times) {
    for (var i = 0; i < times; i++) {
      try {
        await page.evaluate(async () => {
          var x = document.getElementsByClassName("scrollable-trigger__wrapper");
          if (x[0] != undefined) {
            x[0].scrollIntoView();
          }
        });
      } catch (e) {
        Exit("emulate scroll.", e);
      }
      await page.waitForTimeout(scroll_delay);
    }
    return;
}
  
function GetRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
  
// check if element exists and click on it if it does
async function ClickWhenExist(page, selector) {
    let result = await GetQuery(page, selector);
    
    try {
        if (result[0].type == 'tag' && result[0].name == 'button') {
            await page.click(selector);
            await page.waitForTimeout(500);
            return true;
        }
    } catch (e) {
        await Idle(100);
    }
}

async function ClaimDrops(page) {
    await page.goto(base_url + `drops/inventory/`, { "waitUntil": "networkidle2" });
    let drops = await GetQuery(page, dropButtonQuery);
    if (drops.length == 1) {
        for (var i = 0; i < drops.length; i++) {
            await ClickWhenExist(page, dropButtonQuery);
            last_drop = DayJS().format('DD. MMM HH:mm:ss');
        }
        console.log(`[${'i'.brightCyan}] ${'Claimed 1 drop.'.brightCyan}`);
    } else if (drops.length >= 2) {
        for (var i = 0; i < drops.length; i++) {
            await ClickWhenExist(page, dropButtonQuery);
            await Idle(2000);
        }
        console.log(`[${'i'.brightCyan}] ${'Claimed ' + drops.length + ' drops.'.brightCyan}`);
        last_drop = DayJS().format('DD. MMM HH:mm:ss');
    } else {
        await Idle(1000);
    }
	collected_drops = collected_drops + drops.length;
    return;
}

//  
async function Cleanup(browser, page) {
    let pages = await browser.pages();
    await pages.map((page) => page.close());
    treekill(browser.process().pid, 'SIGKILL');
    console.log(`${'Respawning Browser'.gray}`);
    process.removeAllListeners("exit");
    process.removeAllListeners("SIGHUP");
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    return await SpawnBrowser();
}

// Exit function, to give error output to the end-user
async function Exit(msg = "", e = null) {
    run = false;
    if (e && msg.length > 0) {
      console.log(`[${'-'.brightRed}] An error occured while trying to ${msg}(${e.name}: ${e.message.brightRed})`);
    } else {
      console.log(`[${'-'.brightRed}] ERROR!`);
    }
    await Idle(5000);
    run = true;
    //main();
}

// initialize main
async function main() {
    console.clear();
    console.log("IdleTwitch v" + appversion.italic.brightGreen);
    ConsoleTitle("NodeJS @ IdleTwitch v" + appversion);
  
    try {
        UpdateConfigValues();
        var {
            browser,
            page
        } = await SpawnBrowser();
        await Idle(420);
        await WatchStream(browser, page);  
    } catch (e) {
        Exit("initialize main.", e);
    }
}

main()

// shutdown function
async function shutdown() {
    console.log("Exiting...");
    run = false;
    process.Exit();
}
  
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);