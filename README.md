<h1 align="center"><img src="https://trlx.xyz/poggat.png"/></h1>

<h3 align="center">Twitch Drop Farmer</h3>

- [How to get my auth token?](#How-do-I-get-my-auth-token)
- [How to Use?](#How-to-use)
- [Features](#Features)
- [Preview](#Preview)
- [Credits](#Credits)

## How do I get my auth token?
Go to `twitch.tv` then click on F12 and go inside the developer console (on the upper tabs) and paste this inside and press enter:
```js
console.log(decodeURIComponent(document.cookie).match('(?<="authToken":")[a-zA-z0-9]+')[0]);
```

## How do I get my api client id and secret?
Go to `dev.twitch.tv/console` register a new application and add the needed info.

## How to use?
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install the npm packages `npm i`
3. Rename `config.json.example` to `config.json`
4. Edit `config.json` 
5. Double click on `start.bat`

Important: Always use chrome, not chromium

## Features:
- Login via `authToken` given within cookies of twitch
- Checks and claims twitch drops automatically
- Localization done by entering the alpha-2 of your country. A list can be found [here](https://www.iban.com/country-codes)
- Watch fixed streamers, eg. you want to idle for a specific channel due to it having a unique drop / also checks if the game is the same as in the config

## Preview:
<img src="https://cloak.vision/iR2fucWsxS.png" width=480>

## Credits:
d3v, alexsimpler
