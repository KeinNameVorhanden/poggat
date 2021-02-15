const inquirer = require('inquirer');
const path = require('path');

exports.askLogin = () => {
  const questions = [{
    name: 'auth_token',
    type: 'password',
    message: 'Enter your auth-token from twitch.tv:',
    validate: function (value) {
      if (value.length && /.+/.test(value)) {
        return true;
      } else {
        return 'Please enter your valid token!';
      }
    }
  }, {
    name: 'country_code',
    type: 'input',
    message: 'Enter your country code:',
    default: 'GB',
    validate: function (value) {
      if (value.length && /[A-Za-z]+/.test(value) && value.length == 2) {
        return true;
      } else {
        return 'Please enter a 2-alpha country code!';
      }
    }
  }, {
    name: 'exec',
    type: 'input',
    message: 'Enter the chromium executable path:',
    validate: function (value) {
      if (value.length && string !== path.basename(string)) {
        return true;
      } else {
        return 'Please enter your valid path!';
      }
    }
  }, {
    name: 'game',
    type: 'input',
    message: 'Enter the game to watch drops for:',
    default: 'rust',
    validate: function (value) {
      if (value.length && /[A-Za-z1-9]+/.test(value)) {
        return true;
      } else {
        return 'Please enter a valid game name!';
      }
    }
  }
  ];
  return inquirer.prompt(questions);
};
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//


//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
exports.askAuthToken = () => {
  const qAuth = [{
    name: 'auth_token',
    type: 'password',
    message: 'Enter your auth-token from twitch.tv:',
    validate: function (value) {
      if (value.length && /.+/.test(value)) {
        return true;
      } else {
        return 'Please enter your valid token!';
      }
    }
  }];
  return inquirer.prompt(qAuth);
};

exports.askCountryCode = () => {
  const qCode = [{
    name: 'country_code',
    type: 'input',
    message: 'Enter your country code:',
    default: 'GB',
    validate: function (value) {
      if (value.length && /[A-Za-z]+/.test(value) && value.length == 2) {
        return true;
      } else {
        return 'Please enter a valid 2-alpha country code!';
      }
    }
  }];
  return inquirer.prompt(qCode);
};

exports.askExecPath = () => {
  const qExec = [{
    name: 'exec',
    type: 'input',
    message: 'Enter the chromium executable path:',
    validate: function (value) {
      if (value.length && string !== path.basename(string)) {
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
    default: 'rust',
    validate: function (value) {
      if (value.length && /[A-Za-z1-9]+/.test(value)) {
        return true;
      } else {
        return 'Please enter a valid game name!';
      }
    }
  }];
  return inquirer.prompt(qGame);
};
