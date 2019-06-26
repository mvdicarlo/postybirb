const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
const expressPort = 9999;

let oauth = null;
let server = null;

exports.authorizePIN = function(pin) {
  return new Promise((resolve, reject) => {
    request.post(auth.generateAuthUrl('/twitter/v1/authorize'), {
      json: {
        token: oauth.token,
        secret: oauth.secret,
        pin,
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      } else if (body && body.errors) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

exports.getAuthURL = function() {
  return `http://localhost:${expressPort}/auth/twitter`;
};

exports.start = function() {
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

app.get('/auth/twitter', (req, res) => {
  request.get(auth.generateAuthUrl('/twitter/v1/authorize'), (err, response, body) => {
    if (err) {
      res.send('Error occured while trying to authenticate.');
    } else {
      try {
        const r = JSON.parse(body);
        oauth = r;
        res.redirect(r.url);
      } catch (e) {
        res.send(e.message + '\n' + body);
      }
    }
  });
});
