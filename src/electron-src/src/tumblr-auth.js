const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
const expressPort = 4200;
let server = null;
let cb = null;
let tempInfo = null;

exports.start = function(callback) {
  cb = callback;
  if (!server) {
    server = app.listen(expressPort);
  }
};

exports.stop = function() {
  if (server) {
    server.close();
  }

  server = null;
};

exports.getAuthURL = function() {
  return `http://localhost:${expressPort}/tumblr/auth`;
};

exports.refresh = function(token, secret) {
  return new Promise((resolve, reject) => {
    request.post({
      url: auth.generateAuthUrl('/tumblr/v1/refresh'),
      form: {
        token,
        secret
      }
    }, (error, response, body) => {
      if (error) {
        resolve(null);
      } else {
        if (response.statusCode === 500 || response.statusCode === 400) {
          resolve(null);
          return;
        }
        const res = JSON.parse(body);
        if (res && res.user) {
          resolve(res);
        } else {
          resolve(null);
        }
      }
    });
  });
};


app.get('/tumblr/auth', (req, res) => {
  request.get(auth.generateAuthUrl('/tumblr/v1/authorize'), (err, response, body) => {
    if (err) {
      res.redirect(`http://localhost:${expressPort}/tumblr`);
    } else {
      const json = JSON.parse(body);
      tempInfo = json;
      res.redirect(json.url);
    }
  });
});

app.get('/tumblr', (req, res) => {
  // Authorize
  request.post(auth.generateAuthUrl('/tumblr/v1/authorize'), {
    json: {
      oauth_token: req.query.oauth_token,
      secret: tempInfo.secret,
      oauth_verifier: req.query.oauth_verifier
    },
  }, (err, response, body) => {
    if (err || response.statusCode === 500) {
      res.send('Error occured while trying to authenticate.');
      return;
    } else {
      if (cb) {
        cb(body);
      }

      res.send('Tumblr successfully authenticated. You are free to close this window now.');
    }
  });
});
