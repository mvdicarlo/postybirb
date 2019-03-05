const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
const expressPort = 9999;

let oauth = null;
let server = null;

exports.authorizePIN = function (pin) {
    return new Promise((resolve, reject) => {
        request.post(auth.generateAuthUrl('/twitter/authorize'), {
            json: {
                token: oauth.token,
                secret: oauth.secret,
                pin,
            },
        }, (err, res, body) => {
            if (err) {
                reject(err);
            } else {
              if (typeof body === 'string') {
                reject(body);
              } else {
                resolve(body);
              }
            }
        });
    });
};

exports.getAuthURL = function () {
    return `http://localhost:${expressPort}/auth/twitter`;
};

exports.start = function () {
    if (!server) {
        server = app.listen(expressPort);
    }
};

app.get('/auth/twitter', (req, res) => {
    request.get(auth.generateAuthUrl('/twitter/authorize'), (err, response, body) => {
        if (err) {
            res.send('Error occured while trying to authenticate.');
        } else {
            const r = JSON.parse(body);
            oauth = r;
            res.redirect(r.url);
        }
    });
});

exports.stop = function () {
    if (server) {
        server.close();
    }

    server = null;
};
