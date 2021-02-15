require('dotenv').config();
const puppeteer = require('puppeteer-core');
const dayjs = require('dayjs');
const cheerio = require('cheerio');
var fs = require('fs');
const treekill = require('tree-kill');
let colors = require('colors');
var readline = require('readline');

const livecheck = require("./helper/livecheck");
const inquirer = require('./helper/input');

var run = true;
var firstRun = true;
var streamers = null;
const appversion = "0.2.6.0";

const configPath = './config.json';
const baseUrl = 'https://www.twitch.tv/';
const userAgent = (process.env.userAgent || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
let streamersUrl = (process.env.streamersUrl || `https://www.twitch.tv/directory/game/`);

const scrollDelay = (Number(process.env.scrollDelay) || 2000);
const scrollTimes = (Number(process.env.scrollTimes) || 2);

const minWatching = (Number(process.env.minWatching) || 15); // minutes
const maxWatching = (Number(process.env.maxWatching) || 20); // minutes

const streamerListRefresh = (Number(process.env.streamerListRefresh) || 1);
const streamerListRefreshUnit = (process.env.streamerListRefreshUnit || 'hour');

const hideBrowser = true;
const proxy = (process.env.proxy || "");
const proxyAuth = (process.env.proxyAuth || "");

const browserClean = 1;
const browserCleanUnit = 'hour';

let configFile = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : null;
let tmpConfig = null;

if (configFile != null) {
  fs.writeFile(configPath + '.bak', JSON.stringify(configFile), function (err) {
    if (err) {
      console.log(err);
    }
  });
}
const fixedwatch = configFile.watch;

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
  "value": configFile.country_code
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
  "value": configFile.auth_token
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
//const givenDropTextWithLink = 'a[data-test-selector="DropsCampaignInProgressDescription-single-channel-hint-text"]';
const dropButton = 'button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]'

const CHANNEL_STATUS = ".tw-channel-status-text-indicator";
const DROP_STATUS = '[data-a-target="Drops Enabled"]';
const DROP_STATUS2 = '.drops-campaign-details__drops-success';
const DROP_INVENTORY_NAME = '[data-test-selector="drops-list__game-name"]';
const DROP_INVENTORY_LIST = 'div.tw-flex-wrap.tw-tower.tw-tower--180.tw-tower--gutter-sm';
const NO_INVENTORY_DROPS = '[data-test-selector="drops-list__no-drops-default"]';
const DROP_PLACEHOLDER = '.tw-tower__placeholder';
const DROP_ITEM = '.tw-flex';
const CATEGORY_NOT_FOUND = '[data-a-target="core-error-message"]';

const DEBUG_FLAG = false;

function idle(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function livechecker(who) {
  try {
      console.log(`[${'!'.brightYellow}] Checking if ${who.brightMagenta} is online!`);
      let r1 = await livecheck.fPCS(who);
      if (r1.online && capitalize(r1.game) == capitalize(configFile.game)) {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${r1.game.brightGreen}!`);
      } else if (r1.online && capitalize(r1.game) != capitalize(configFile.game)) {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'online'.brightGreen} and plays ${r1.game.brightYellow}!`);
      } else {
        console.log(`[${'i'.brightCyan}] ${who.brightMagenta} is ${'offline'.brightRed}!`);
      }
      return r1
  } catch(e) {
      throw e;
  }
}

async function query(page, query) {
  let bodyHTML = await page.evaluate(() => document.body.innerHTML);
  let $ = cheerio.load(bodyHTML);
  const jquery = $(query);

  if (DEBUG_FLAG && !jquery)
    throw new Error("Invalid query result");
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

async function watchStream(browser, page) {
  console.log(`\n[${'●'.brightRed}] ${'MAIN'.brightRed}`);
  var streamerLastRefresh = dayjs().add(streamerListRefresh, streamerListRefreshUnit);
  var browserLastRefresh = dayjs().add(browserClean, browserCleanUnit);

  await checkLogin(page);
  while (run) {
    try {
      
      let watch = null;
      if (fixedwatch.length != 0) {
        for (var i = 0; i < fixedwatch.length; i++) {
          const status = await livechecker(fixedwatch[i])
          if (status.online && capitalize(status.game) == capitalize(configFile.game)) {
            watch = fixedwatch[i];
            break;
          }
          watch = null;
        }
      }
      
      if (!configFile.only_idle_fixed) {
        if (watch == null || watch == undefined) {
          console.log(`[${'!'.brightYellow}] Getting a random streamer.`)
          if (dayjs(browserLastRefresh).isBefore(dayjs())) {
            var newSpawn = await cleanup(browser, page);
            browser = newSpawn.browser;
            page = newSpawn.page;
            firstRun = true;
            browserLastRefresh = dayjs().add(browserClean, browserCleanUnit);
          }

          await getAllStreamer(page);
          watch = streamers[getRandomInt(0, streamers.length - 1)];
          streamerLastRefresh = dayjs().add(streamerListRefresh, streamerListRefreshUnit);
        }
      }
      var sleep = getRandomInt(minWatching, maxWatching) * 60000;

      await page.goto(baseUrl + "drops/inventory/", {
        "waitUntil": "networkidle2"
      });

      if (!firstRun) {
        await checkLogin(page);
      }

      await idle(1000);
      let drops = await query(page, dropButton);
      if (drops.length == 1) {
        await clickWhenExist(page, dropButton);
        console.log(`[${'i'.brightCyan}] Claimed 1 drop item.`)
      } else if (drops.length >= 2) {
        for (var i = 0; i < drops.length; i++) {
          await clickWhenExist(page, dropButton[i]);
        }
        console.log(`[${'i'.brightCyan}] Claimed ${drops.length} drop items.`)
      } else {
        await idle(1000);
      }

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
        let    = dayjs().format('HH:mm:ss');

        info = (`[${'i'.brightCyan}] Watching: ` + baseUrl + watch);
        info = info + "\n" + `[${'i'.brightCyan}] Account status: ` + (status[0] ? status[0].children[0].data : "Unknown");
        info = info + "\n" + (`[${'i'.brightCyan}] Time: ` + dayjs().format('HH:mm:ss'));
        info = info + "\n" + (`[${'i'.brightCyan}] Watching stream for ` + sleep / 60000 + ' minutes => ' + dayjs().add((sleep / 60000), 'minutes').format('HH:mm:ss') + '\n');

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
    if (fs.existsSync(configPath)) {
      await idle(1000);
      console.log(`[${'+'.brightGreen}] Found config file.`);

      configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      tmpConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (proxy) browserConfig.args.push('--proxy-server=' + proxy);
      
      if (configFile.exec != "" && configFile.exec != undefined && configFile.exec.length > 0) {
        browserConfig.executablePath = configFile.exec;
      } else {
        let getPath = await inquirer.askExecPath();
        browserConfig.executablePath = getPath;
      }

      if (configFile.game != "" && configFile.game != undefined && configFile.game.length > 0) {
        streamersUrl = (streamersUrl + configFile.game.toUpperCase());
      } else {
        let getGame = await inquirer.askGameName();
        streamersUrl = getGame;
      }      

      if (configFile.auth_token != "" && configFile.auth_token != undefined && configFile.auth_token.length >= 28) {
        auth_cookie[0].value = configFile.auth_token;
      } else {
        let getToken = await inquirer.askAuthToken();
        auth_cookie[0].value = getToken;
      }

      if (fixedwatch) {
        let watchstring = "";
        for (var i = 0; i < fixedwatch.length; i++) {
          watchstring = watchstring + fixedwatch[i];
          if (i < fixedwatch.length - 1) {
            watchstring = watchstring + ", ";
          }
        }

        if (fixedwatch.length == 1) {
          console.log(`[${'+'.brightGreen}] Found fixed streamer to watch if online.`);
          console.log(`[${'i'.brightCyan}] ${watchstring}`);
        } else if (fixedwatch.length > 1) {
          console.log(`[${'+'.brightGreen}] Found fixed streamers to watch if online.`);
          console.log(`[${'i'.brightCyan}] ${watchstring}`);
        }
      } else {
        console.log(`[${'!'.brightRed}] No fixed streamer(s) found.`);
      }

      return;
    } else {
      console.log(`[${'-'.brightRed}] No config file found!`);

      let input = await inquirer.askLogin();

      fs.writeFile(configPath, JSON.stringify(input), function (err) {
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

async function spawnBrowser() {
  console.log(`\n[${'●'.brightRed}] ${'BROWSER'.brightRed}`);

  try {
    var browser = await puppeteer.launch(browserConfig);
    var page = await browser.newPage();

    await page.setUserAgent(userAgent);
    await page.setCookie(...auth_cookie);
    await page.setCookie(...localization_cookie);

    
    await page.setDefaultNavigationTimeout(process.env.timeout || 0);
    await page.setDefaultTimeout(process.env.timeout || 0);

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

async function getAllStreamer(page) {
  try {
    await page.goto(streamersUrl, {
      "waitUntil": "networkidle0"
    });
    
    const notFound = await query(page, CATEGORY_NOT_FOUND);
    if (notFound.length || notFound.text() == "Category does not exist") {
      console.log(`[${'-'.brightRed}] Game category not found, did you enter the game as displayed on twitch?`);
      exit();
    }
    
    await scroll(page, scrollTimes);
    const jquery = await query(page, channelsQuery);
    streamers = null;
    streamers = new Array();

    for (var i = 0; i < jquery.length; i++) {
      streamers[i] = jquery[i].attribs.href.split("/")[1];
    }

    console.log(`[${'+'.brightGreen}] Got streamers and filtered them!`);
    return;
  } catch (e) {
    exit("get streamers/ filter streamer.", e);
  }
}

let retries = 0;
async function checkLogin(page) {
  let cookieSetByServer = await page.cookies();
  for (var i = 0; i < cookieSetByServer.length; i++) {
    if (cookieSetByServer[i].name == 'twilight-user') {
      let name = await getUserProperty(page, 'displayName');
      if (firstRun) {
        console.log(`[${'+'.brightGreen}] Successfully logged in as ${name.bold.green}!`);
      }
      retries = 0;
      return true;
    }
  }

  cookie.value = configFile.auth_token;
  retries++
  await idle(250);
  checkLogin(page);
}

async function scroll(page, times) {
  for (var i = 0; i < times; i++) {
    try {
      await page.evaluate(async () => {
        var x = document.getElementsByClassName("scrollable-trigger__wrapper");
        x[0].scrollIntoView();
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

async function shutDown() {
  console.log("\nExiting...");
  run = false;
  process.exit();
}

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

async function main() {
  console.clear();
  console.log("IdleTwitch v" + appversion.italic.brightGreen);

  try {
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

async function writeCurrentInfo(info) {
  console.log(info)
}

function arraycontains(needles, haystack){
  if(needles.includes(haystack)) {
    return true;
  }
  return false;
}

main();

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
