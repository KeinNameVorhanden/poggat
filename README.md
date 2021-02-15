<h1 align="center"><img src="https://trlx.xyz/poggat.png"/></h1>

<h3 align="center">Twitch Drop Farmer</h3>

- [How to get my auth token?](#How-do-I-get-my-auth-token)
- [How to Use?](#How-to-use)
- [Features](#Features)
- [Credits](#Credits)
- [Donations](#Donations)

## How do I get my auth token?
GO to `twitch.tv` then click on F12 and go inside the developer console (on the upper tabs) and paste this inside and press enter:
```js
console.log(decodeURIComponent(document.cookie).match('(?<="authToken":")[a-zA-z0-9]+')[0]);
```

## How to use?
1. Install [Node.js](https://nodejs.org/en/download/)
2. Install the npm packages `npm ci`
3. Double click on `start.bat`

## Features:
- Login via `authToken` given within cookies of twitch
- Checks and claims twitch drops automatically
- Localization done by entering the alpha-2 of your country. A list can be found [here](https://www.iban.com/country-codes)
- Watches fixed streamers, eg. you want to idle for a specific channel due to it having a unique drop / also checks if the game is the same as in the config

## Credits:
d3v, alexsimpler

## Donations
Buy me a coffee:

<a href="https://www.buymeacoffee.com/trlx" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="trlx" data-color="#0b0b0b" data-emoji=""  data-font="Cookie" data-text="buy me a coffee" data-outline-color="#ffffff" data-font-color="#ffffff" data-coffee-color="#FFDD00" ></script>
