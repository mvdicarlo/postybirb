const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
let oauth = {};
let authorized = false;
const expressPort = 9999;

let server = null;

const stopExpress = function stopExpress() {
    if (server) server.close();
    server = null;
};

const startExpress = function startExpress() {
    server = app.listen(expressPort);
};

app.get('/auth/twitter', (req, res) => {
    $.get(auth.generateAuthUrl('/twitter/authorize'))
    .done((r) => {
        oauth.token = r.token;
        oauth.token_secret = r.secret;
        res.redirect(r.url);
    })
    .fail(() => {
        res.send('Error occured while trying to authenticate.');
    });
});

const authorizeWithPin = function pinAuth(pin) {
    oauth.username = undefined;
    return new Promise((resolve, reject) => {
        $.post(auth.generateAuthUrl('/twitter/authorize'), {
            token: oauth.token,
            secret: oauth.token_secret,
            pin,
        })
      .done((res) => {
          if (res.err) {
              authorized = false;
              oauth = {};
              reject(res.err);
          } else {
              authorized = true;
              oauth = {
                  token: res.accessToken,
                  secret: res.accessTokenSecret,
                  username: res.results.screen_name,
              };

              db.set('twitter', oauth).write();
              resolve(true);
          }
      }).fail((err) => {
          authorized = false;
          oauth = {};
          reject(err);
      });
    });
};

function unauthorizeTwitter() {
    db.unset('twitter').write();
    oauth = {};
    authorized = false;
}

/**
 * isAuthenticated - return whether or not Twitter is authenticated
 *
 * @return {boolean}  is authenticated
 */
function isAuthenticated() {
    return authorized;
}

/**
 * postToTwitter - Try to post to Twitter
 *
 * @param {object}    manager manager for twitter
 * @param  {b64} media submission file in b64 format
 */
function postToTwitter(status, medias) {
    return new Promise((resolve, reject) => {
        if (!isAuthenticated()) {
            reject(Error('Not Authorized'));
            return;
        }

        const post = (status || '').substring(0, 280);
        const postObj = {
            status: post,
            token: oauth.token,
            secret: oauth.secret,
            medias: medias || [],
        };


        $.post(auth.generateAuthUrl('/twitter/post'), { data: Buffer.from(JSON.stringify(postObj)).toString('base64') })
            .done(() => {
                resolve(true);
            }).fail((err) => {
                let errMsg = '';
                try {
                    errMsg = JSON.parse(JSON.parse(err.responseText).e.data).errors[0].message;
                } catch (e) {
                    // couldnt make message
                }

                reject({
                    err,
                    msg: errMsg,
                    notify: errMsg,
                    status,
                });
            });
    });
}

/**
 * loadToken - try to load authentication token and verify it is still valid
 *
 */
exports.refresh = function loadToken() {
    return new Promise((resolve, reject) => {
        checkTokens(resolve, reject);
    });
};

function checkTokens(resolve, reject) {
    const storedToken = db.get('twitter').value();
    if (!storedToken) {
        reject(false);
        authorized = false;
    } else {
        request.post({ url: auth.generateAuthUrl('/twitter/verify'), form: { token: storedToken.token, secret: storedToken.secret } }, (error, response, body) => {
            if (error) {
                reject(false);
                unauthorizeTwitter();
            } else {
                oauth = storedToken;
                authorized = true;
                resolve(true);
            }
        });
    }
}

exports.checkAuthorized = function checkAuthorized() {
    return new Promise((resolve, reject) => {
        checkTokens(resolve, reject);
    });
};

exports.getAuthorizationURL = function getURL() {
    return `http://localhost:${expressPort}/auth/twitter`;
};

exports.getUsername = function getUsername() {
    return oauth.username || undefined;
};

exports.post = function post(status, buffer) {
    if (buffer) { // status with media
        return postToTwitter(status, buffer);
    }
    return postToTwitter(status, false);
};

exports.setTwitterPin = authorizeWithPin;
exports.start = startExpress;
exports.stop = stopExpress;
exports.isAuthorized = isAuthenticated;
exports.unauthorize = unauthorizeTwitter;
