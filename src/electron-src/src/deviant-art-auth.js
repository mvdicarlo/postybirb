const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
const expressPort = 4200;
let server = null;
let cb = null;

exports.start = function (callback) {
    cb = callback;
    if (!server) {
        server = app.listen(expressPort);
    }
};

exports.stop = function () {
    if (server) {
        server.close();
    }

    server = null;
};

exports.getAuthURL = function () {
    return auth.generateAuthUrl('/deviantart/authorize');
};

exports.refresh = function (authInfo) {
    return new Promise((resolve, reject) => {
        request.get(`https://www.deviantart.com/api/v1/oauth2/placebo?access_token=${authInfo.access_token}`, (err, response, body) => {
            if (err) {
                resolve(false);
                return;
            }

            const placebo = JSON.parse(body);
            if (placebo.status === 'success') {
                resolve(authInfo);
            } else {
                request.post(auth.generateAuthUrl('/deviantart/refresh'), {
                    json: {
                        refresh_token: authInfo.refresh_token,
                    },
                }, (err, response, body) => {
                    if (err) {
                        resolve(false);
                        return;
                    }

                    const json = JSON.parse(body.body);
                    if (json.error) {
                      resolve(false);
                    } else {
                      resolve(Object.assign(authInfo, json));
                    }
                });
            }
        });
    });
};

app.get('/deviantart', (req, res) => {
    res.redirect('https://www.deviantart.com');
    getAccessToken(req.query.code);
});

function getAccessToken(code) {
    request.post(auth.generateAuthUrl('/deviantart/accesstoken'), { json: { code } }, (err, response, body) => {
        if (err) {
            cb(null);
        } else {
            const json = JSON.parse(body.body);
            request.get(`https://www.deviantart.com/api/v1/oauth2/user/whoami?mature_content=true&access_token=${json.access_token}`, (err, response, body) => {
                if (err) {
                    cb(null);
                } else {
                    cb(Object.assign(json, JSON.parse(body)));
                }
            });
        }
    });
}
