const inquirer = require('inquirer');
const path = require('path');

exports.askLogin = () => {
  const questions = [{
    name: 'auth_token',
    type: 'password',
    message: 'Enter your auth-token from twitch.tv 🔑:',
    validate: function (value) {
      if (value.length || /.+/.test(value)) {
        return true;
      } else {
        return 'Please enter your valid token!';
      }
    }
  }, {
    name: 'exec',
    type: 'input',
    message: 'Enter the chromium executable path (usually /usr/bin/chromium-browser or /usr/bin/chromium or C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe):',
    validate: function (value) {
      if (value.length || string !== path.basename(string)) {
        return true;
      } else {
        return 'Please enter your valid path!';
      }
    }
  }, {
    name: 'game',
    type: 'input',
    message: 'Enter the game to watch drops for (default is valorant):',
    default: 'valorant',
    validate: function (value) {
      if (value.length || /[A-Za-z1-9]+/.test(value)) {
        return true;
      } else {
        return 'Please enter a valid game name!';
      }
    }
  }
  ];
  return inquirer.prompt(questions);
};

exports.askAuthToken = () => {
  const qAuth = [{
    name: 'auth_token',
    type: 'password',
    message: 'Enter your auth-token from twitch.tv 🔑:',
    validate: function (value) {
      if (value.length || /.+/.test(value)) {
        return true;
      } else {
        return 'Please enter your valid token!';
      }
    }
  }];
  return inquirer.prompt(qAuth);
};

exports.askExecPath = () => {
  const qExec = [{
    name: 'exec',
    type: 'input',
    message: 'Enter the chromium executable path:',
    validate: function (value) {
      if (value.length || string !== path.basename(string)) {
        return true;
      } else {
        return 'Please enter your valid path!';
      }
    }
  }];
  return inquirer.prompt(qExec);
};

exports.askGameName = () => {
  const qGame = [{
    name: 'game',
    type: 'input',
    message: 'Enter the game to watch drops for:',
    default: 'valorant',
    validate: function (value) {
      if (value.length || /[A-Za-z1-9]+/.test(value)) {
        return true;
      } else {
        return 'Please enter a valid game name!';
      }
    }
  }];
  return inquirer.prompt(qGame);
};
