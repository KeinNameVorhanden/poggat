<h1 align="center"><img src="https://trlx.xyz/poggat.png"/></h1>

<h3 align="center">Twitch Drop Farmer</h3>

- [How to get my auth token?](#How-do-I-get-my-auth-token)
- [How to Use?](#How-to-use)
- [Features](#Features)
- [Preview](#Preview)
- [Credits](#Credits)
- [Donations](#Donations)

## How do I get my auth token?
Go to `twitch.tv` then click on F12 and go inside the developer console (on the upper tabs) and paste this inside and press enter:
```js
console.log(decodeURIComponent(document.cookie).match('(?<="authToken":")[a-zA-z0-9]+')[0]);
```

## How to use?
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install the npm packages `npm i`
3. Double click on `start.bat`

## Features:
- Login via `authToken` given within cookies of twitch
- Checks and claims twitch drops automatically
- Localization done by entering the alpha-2 of your country. A list can be found [here](https://www.iban.com/country-codes)
- Watch fixed streamers, eg. you want to idle for a specific channel due to it having a unique drop / also checks if the game is the same as in the config

## Preview:
<img src="https://ganja.taxi/bNNnsrkRQA.png" width=480>

## Credits:
d3v, alexsimpler

## Donations
<a href="https://www.buymeacoffee.com/trlx" target="_blank"><img src="https://trlx.xyz/buymeacoffee_small.png"></a>
