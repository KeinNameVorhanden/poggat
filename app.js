require('dotenv').config();
const puppeteer = require('puppeteer-core');
const dayjs = require('dayjs');
const cheerio = require('cheerio');
var fs = require('fs');
var consoletitle = require('console-title');
const treekill = require('tree-kill');
let colors = require('colors');
var readline = require('readline');

const livecheck = require("./helper/livecheck");
const userinput = require('./helper/input');

var run = true;
var firstRun = true;
var streamers = null;
var collectedDrops = 0;
var lastDrop = "Never";
const appversion = "0.2.7.3";

const config = './config.json';
const baseUrl = 'https://www.twitch.tv/';
const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
let streamersUrl = `https://www.twitch.tv/directory/game/`;

const scrollDelay = 2000;
const scrollTimes = 2;

const streamerListRefresh = 1;
const streamerListRefreshUnit = 'hour';

const browserClean = 1;
const browserCleanUnit = 'hour';

let configData = fs.existsSync(config) ? JSON.parse(fs.readFileSync(config, 'utf8')) : null;
let tmpConfig = null;

if (configData != null) {
  fs.writeFile(config + '.bak', JSON.stringify(configData), function (err) {
    if (err) {
      console.log(err);
    }
  });
}

var minWatching = configData.minWatching ? configData.minWatching : 15;
var maxWatching = configData.maxWatching ? configData.maxWatching : 20;
var fixedWatch = configData.watch;
var hideBrowser = configData.hideBrowser ? configData.hideBrowser : false;
var proxy = "";
var proxyAuth = "";

var browserConfig = {
  headless: hideBrowser,
  defaultViewport: null,
  args: [
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

const localization_cookie = [{
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
  "value": configData.country_code
}];

var auth_cookie =  [{
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
  "value": configData.auth_token
}];

const cookiePolicyQuery = 'button[data-a-target="consent-banner-accept"]';
const matureContentQuery = 'button[data-a-target="player-overlay-mature-accept"]';
const sidebarQuery = '*[data-test-selector="user-menu__toggle"]';
const userStatusQuery = 'span[data-a-target="presence-text"]';
const channelsQuery = 'a[data-test-selector*="ChannelLink"]';
const streamPauseQuery = 'button[data-a-target="player-play-pause-button"]';
const closeNotification = 'button[aria-label="Close"]';
const streamSettingsQuery = '[data-a-target="player-settings-button"]';
const streamQualitySettingQuery = '[data-a-target="player-settings-menu-item-quality"]';
const streamQualityQuery = 'input[data-a-target="tw-radio"]';
const categoryNotFound = '[data-a-target="core-error-message"]';
const dropButton = 'button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]';
const dropStatus = '[data-a-target="Drops Enabled"]';
const dropStatus2 = '.drops-campaign-details__drops-success';
//const filterForDrops = '[data-a-target="form-tag-add-filter-suggested"]';

function idle(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function livechecker(who) {
  try {
      console.log(`[${'!'.brightYellow}] Checking if ${who.brightMagenta} is online!`);

      let intruder = await livecheck.fPCS(who);
      
      if (intruder.online && capitalize(intruder.game) == capitalize(configData.game)) {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${intruder.game.brightGreen}!`);
      } else if (intruder.online && capitalize(intruder.game) != capitalize(configData.game)) {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${intruder.game.brightYellow}!`);
      } else {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
      }
      return intruder
  } catch(e) {
      throw e;
  }
}

async function query(page, query) {
  let bodyHTML = await page.evaluate(() => document.body.innerHTML);
  let $ = cheerio.load(bodyHTML);
  const jquery = $(query);
  
  return jquery;
}

function capitalize(word) {
  return (word[0].toUpperCase() + word.substring(1));
}

async function getUserProperty(page, name) {
  if (!name || !(/^[A-Za-z1-9]+$/.test(name))) throw new Error("Invalid cookie name: ", name);

  const data = await page.cookies();
  let cookieValue = undefined;

  for (let i = 0; i < data.length; i++) {
    if (data[i].name == 'twilight-user') {
      cookieValue = JSON.parse(decodeURIComponent(data[i].value));
      if (!cookieValue[name]) throw new Error("Invalid cookie value returned");
    }
  }
  return cookieValue[name];
}

// real main function
async function watchStream(browser, page) {
  console.log(`\n[${'●'.brightRed}] ${'MAIN'.brightRed}`);
  var streamerLastRefresh = dayjs().add(streamerListRefresh, streamerListRefreshUnit);
  var browserLastRefresh = dayjs().add(browserClean, browserCleanUnit);

  await checkLogin(page);
  while (run) {
    try {
      configData = await JSON.parse(fs.readFileSync(config, 'utf8'));
      fixedWatch = configData.watch;
      
      let watch = null;
      if (fixedWatch.length > 0) {
        for (var i = 0; i < fixedWatch.length; i++) {
          const status = await livechecker(fixedWatch[i])
          if (status.online && capitalize(status.game) == capitalize(configData.game)) {
            watch = fixedWatch[i];
            break;
          }
          watch = null;
        }
      }
      
      if (!configData.onlyIdleFixed) {
        if (watch == null || watch == undefined) {
          console.log(`[${'!'.brightYellow}] Getting a random streamer with active drops.`)
          if (dayjs(browserLastRefresh).isBefore(dayjs())) {
            var newSpawn = await cleanup(browser, page);
            browser = newSpawn.browser;
            page = newSpawn.page;
            firstRun = true;
            browserLastRefresh = dayjs().add(browserClean, browserCleanUnit);
          }

          await getAllStreamer(page);
          
          if (streamers.length > 0 || streamers.length != undefined) {
            watch = streamers[getRandomInt(0, streamers.length - 1)];
            streamerLastRefresh = dayjs().add(streamerListRefresh, streamerListRefreshUnit);

            await page.goto(baseUrl + watch, {
              "waitUntil": "networkidle2"
            });
          }
          

          /*const dropsEnabled = (await query(page, dropStatus)).length || (await query(page, dropStatus2)).length;
          if (!dropsEnabled) {
            console.log(`[${'-'.brightred}] Streamer didnt have drops!`);
            watch = null;
          }*/
        }
      }
      var sleep = getRandomInt(minWatching, maxWatching) * 60000;

      await page.goto(baseUrl + "drops/inventory/", {
        "waitUntil": "networkidle2"
      });

      if (!firstRun) {
        await checkLogin(page);
      }
      
      consoletitle("NodeJS @ IdleTwitch v" + appversion + " | Drops collected: " + collectedDrops + " | Last Drop: " + lastDrop);

      await idle(1500);
      let drops = await query(page, dropButton);
      if (drops.length == 1) {
        await clickWhenExist(page, dropButton);
        console.log(`[${'i'.brightCyan}] ${'Claimed 1 drop item.'.brightCyan}`)
        lastDrop = dayjs().format('HH:mm:ss');
      } else if (drops.length >= 2) {
        for (var i = 0; i < drops.length; i++) {
          await clickWhenExist(page, dropButton);
          await idle(2000);
        }
        console.log(`[${'i'.brightCyan}] ${'Claimed ' + drops.length + ' drop items.'.brightCyan}`)
        lastDrop = dayjs().format('HH:mm:ss');
      } else {
        await idle(1000);
      }

      collectedDrops = collectedDrops + drops.length;

      if (watch != null) {
        await page.goto(baseUrl + watch, {
          "waitUntil": "networkidle2"
        });

        await idle(1000);
        await clickWhenExist(page, cookiePolicyQuery);
        await clickWhenExist(page, matureContentQuery);

        if (firstRun) {
          await clickWhenExist(page, streamPauseQuery);
          await clickWhenExist(page, closeNotification);
          await page.waitFor(streamSettingsQuery);
          await clickWhenExist(page, streamSettingsQuery);
          await page.waitFor(streamQualitySettingQuery);
          await clickWhenExist(page, streamQualitySettingQuery);
          await page.waitFor(streamQualityQuery);
          await clickWhenExist(page, closeNotification);

          var resolution = await query(page, streamQualityQuery);
          resolution = resolution[resolution.length - 1].attribs.id;
          await page.evaluate((resolution) => {
            document.getElementById(resolution).click();
          }, resolution);
          console.log(`[${'!'.brightYellow}] Lowest resolution set!`);

          await clickWhenExist(page, closeNotification);
          await clickWhenExist(page, streamPauseQuery);
          await page.keyboard.press('m');
        }

        await idle(100);
        await page.keyboard.press('m');
        await idle(100);
        await page.keyboard.press('m');

        await clickWhenExist(page, sidebarQuery);
        await page.waitFor(userStatusQuery);
        let status = await query(page, userStatusQuery);
        await clickWhenExist(page, sidebarQuery);

        info = (`[${'i'.brightCyan}] Watching: ` + baseUrl + watch);
        //info = info + "\n" + `[${'i'.brightCyan}] Account status: ` + (status[0] ? status[0].children[0].data : "Unknown");
        //info = info + "\n" + (`[${'i'.brightCyan}] Time: ` + dayjs().format('HH:mm:ss'));
        //info = info + "\n" + (`[${'i'.brightCyan}] Watching stream for ` + sleep / 60000 + ' minutes => ' + dayjs().add((sleep / 60000), 'minutes').format('HH:mm:ss') + '\n');

        writeCurrentInfo(info);

        if (firstRun) {        
          firstRun = false;
        }
      } else {
        sleep = sleep * 3;
        console.log(`[${'i'.brightCyan}] Idling for ` + sleep / 60000 + ' minutes => ' + dayjs().add((sleep / 60000), 'minutes').format('HH:mm:ss') + '\n');
      }
      
      await page.waitFor(sleep);
    } catch (e) {
      exit("trying to watch a stream.", e);
    }
  }
}

async function readLoginData() {
  console.log(`\n[${'●'.brightRed}] ${'CONFIG'.brightRed}`);

  try {
    if (fs.existsSync(config)) {
      await idle(1000);
      console.log(`[${'+'.brightGreen}] Found config file.`);

      configData = JSON.parse(fs.readFileSync(config, 'utf8'));
      tmpConfig = JSON.parse(fs.readFileSync(config, 'utf8'));

      if (proxy) browserConfig.args.push('--proxy-server=' + proxy);
      
      if (configData.exec != "" && configData.exec != undefined && configData.exec.length > 0) {
        browserConfig.executablePath = configData.exec;
      } else {
        let getPath = await userinput.askExecPath();
        browserConfig.executablePath = getPath;
      }

      if (configData.game != "" && configData.game != undefined && configData.game.length > 0) {
        streamersUrl = streamersUrl + configData.game.toUpperCase();
      } else {
        let getGame = await userinput.askGameName();
        streamersUrl = getGame;
      }      

      if (configData.auth_token != "" && configData.auth_token != undefined && configData.auth_token.length >= 28) {
        auth_cookie[0].value = configData.auth_token;
      } else {
        let getToken = await userinput.askAuthToken();
        auth_cookie[0].value = getToken;
      }

      if (fixedWatch) {
          let watchstring = "";
          for (var i = 0; i < fixedWatch.length; i++) {
            watchstring = watchstring + fixedWatch[i];
            if (i < fixedWatch.length - 1) {
              watchstring = watchstring + ", ";
            }
          }

          if (fixedWatch.length == 1) {
            console.log(`[${'+'.brightGreen}] Found fixed streamer to watch if online.`);
            console.log(`[${'i'.brightCyan}] ${watchstring}`);
          } else if (fixedWatch.length > 1) {
            console.log(`[${'+'.brightGreen}] Found fixed streamers to watch if online.`);
            console.log(`[${'i'.brightCyan}] ${watchstring}`);
          }
      } else {
        console.log(`[${'!'.brightRed}] No fixed streamer(s) found.`);
      }

      return;
    } else {
      console.log(`[${'-'.brightRed}] No config file found!`);

      let input = await userinput.askLogin();

      fs.writeFile(config, JSON.stringify(input), function (err) {
        if (err) {
          console.log(err);
        }
      });

      if (proxy) browserConfig.args[6] = '--proxy-server=' + proxy;
      browserConfig.executablePath = input.exec;
      auth_cookie[0].value = input.auth_token;

      return;
    }
  } catch (e) {
    exit("check for config file.", e);
  }
}

// spawn browser with predefined configuration
async function spawnBrowser() {
  console.log(`\n[${'●'.brightRed}] ${'BROWSER'.brightRed}`);

  try {
    var browser = await puppeteer.launch(browserConfig);
    var page = await browser.newPage();

    await page.setUserAgent(userAgent);
    await page.setCookie(...auth_cookie);
    await page.setCookie(...localization_cookie);

    
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    if (proxyAuth) {
      await page.setExtraHTTPHeaders({
        'Proxy-Authorization': 'Basic ' + Buffer.from(proxyAuth).toString('base64')
      })
    }
    console.log(`[${'+'.brightGreen}] Successfully set up the browser.`);
  } catch (e) {
    exit("set up the browser", e);
  }

  return {
    browser,
    page
  };
}

// collect all streamers from current page
async function getAllStreamer(page) {
  try {
    await page.goto(streamersUrl  + "?tl=c2542d6d-cd10-4532-919b-3d19f30a768b", {
      "waitUntil": "networkidle0"
    });
    
    const notFound = await query(page, categoryNotFound);
    if (notFound.length || notFound.text() == "Category does not exist") {
      console.log(`[${'-'.brightRed}] Game category not found, did you enter the game as displayed on twitch?`);
      exit();
    }

    /*const filters = await query(page, filterForDrops);
    clickWhenExist(page, filters[0]);
    await idle(500);*/
    
    await scroll(page, scrollTimes);
    const jquery = await query(page, channelsQuery);
    streamers = null;
    streamers = new Array();

    for (var i = 0; i < jquery.length; i++) {
      streamers[i] = jquery[i].attribs.href.split("/")[1];
    }

    if (streamers.length > 0) {
      console.log(`[${'+'.brightGreen}] Got streamers and filtered them!`);
      if (streamers.length < 6) {
        //console.log(`[${'i'.brightCyan}] `+ streamers);
      }
    } else {
      console.log(`[${'!'.brightRed}] No streamer found!`);
    }
    return;
  } catch (e) {
    exit("get streamers/filter streamer.", e);
  }
}

// if cookie 'twilight-user' exists, print username, if not set cookie again
async function checkLogin(page) {
  let cookieSetByServer = await page.cookies();
  for (var i = 0; i < cookieSetByServer.length; i++) {
    if (cookieSetByServer[i].name == 'twilight-user') {
      let name = await getUserProperty(page, 'displayName');
      if (firstRun) {
        console.log(`[${'+'.brightGreen}] Successfully logged in as ${name.bold.green}!`);
      }
      return true;
    }
  }

  auth_cookie.value = configData.auth_token;
  await idle(250);
  checkLogin(page);
}

// scroll current page, for x {times} and for x {scrollDelay} ms
async function scroll(page, times) {
  for (var i = 0; i < times; i++) {
    try {
      await page.evaluate(async () => {
        var x = document.getElementsByClassName("scrollable-trigger__wrapper");
        if (x[0] != undefined) {
          x[0].scrollIntoView();
        }
      });
    } catch (e) {
      exit("emulate scroll.", e);
    }
    await page.waitFor(scrollDelay);
  }
  return;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// check if element exists and click on it if it does
async function clickWhenExist(page, selector) {
  let result = await query(page, selector);

  try {
    if (result[0].type == 'tag' && result[0].name == 'button') {
      await page.click(selector);
      await page.waitFor(500);
      return;
    }
  } catch (e) {
    await idle(100);
  }
}

async function cleanup(browser, page) {
  const pages = await browser.pages();
  await pages.map((page) => page.close());
  await treekill(browser.process().pid, 'SIGKILL');
  return await spawnBrowser();
}

async function killBrowser(browser, page) {
  const pages = await browser.pages();
  await pages.map((page) => page.close());
  treekill(browser.process().pid, 'SIGKILL');
  return;
}

// exit function, to give error output to the end-user
async function exit(msg = "", e = null) {
  run = false;
  if (e && msg.length > 0) {
    console.log(`[${'-'.brightRed}] An error occured while trying to ${msg}(${e.name}: ${e.message.brightRed})`);
  } else {
    console.log(`[${'-'.brightRed}] ERROR!`);
  }
  await idle(5000);
  run = true;
  main();
}

// initialize main
async function main() {
  console.clear();
  console.log("IdleTwitch v" + appversion.italic.brightGreen);
  consoletitle("NodeJS @ IdleTwitch v" + appversion);

  try {
    await readLoginData();
    var {
      browser,
      page
    } = await spawnBrowser();
    await idle(666);
    await watchStream(browser, page);

  } catch (e) {
    exit("initialize main.", e);
  }
};

// function that was made quite obsolete
async function writeCurrentInfo(info) {
  console.log(info)
}

// once needed
function arraycontains(needles, haystack){
  if(needles.includes(haystack)) {
    return true;
  }
  return false;
}

main();

// shutdown function
async function shutdown() {
  console.log("\nExiting...");
  run = false;
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
