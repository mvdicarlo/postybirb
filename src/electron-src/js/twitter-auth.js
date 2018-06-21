const OAuth = require('oauth').OAuth;
const express = require('express');
const twitterAPI = require('node-twitter-api');
const auth = require('./auth-server');

const app = express();
let oauth = {};
let authorized = false;
const expressPort = 9999;

let twit = null;
let oa = null;

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
        $.post(auth.generateAuthUrl('/twitter/authorize'), { token: oauth.token, secret: oauth.token_secret, pin })
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

                store.set('twitter', oauth, new Date().setMonth(new Date().getMonth() + 2));
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
    store.remove('twitter');
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

function uploadMedia(media) {
    return new Promise((resolve, reject) => {
        if (media) {
            twit.uploadMedia({
                media: media.toString('base64'),
                isBase64: true
            }, oauth.token, oauth.secret, (err, response) => {
                if (err) {
                    reject({ err, msg: Error('Failed to post to Twitter.') })
                } else {
                    resolve(response.media_id_string);
                }
            })
        } else {
            resolve(false);
        }
    });
}

/**
 * postToTwitter - Try to post to Twitter
 *
 * @param {object}    manager manager for twitter
 * @param  {b64} media submission file in b64 format
 */
function postToTwitter(status, medias) {
    return new Promise((resolve, reject) => {
        try {
            const post = status || '';

            if (!isAuthenticated()) {
                reject(Error('Not Authorized'));
                return;
            }

            if (medias) {
                const promises = medias.map(media => uploadMedia(media));
                Promise.all(promises).then((values) => {
                    oa.post('https://api.twitter.com/1.1/statuses/update.json', oauth.token, oauth.secret, {
                        status: post.substring(0, 280),
                        media_ids: values.slice(0, 3).join(','),
                    }, (e, data, res) => {
                        if (e) {
                            reject({ e, msg: Error('Failed to post to Twitter.'), status, res });
                        } else {
                            resolve(true);
                        }
                    });
                }).catch((err) => {
                    reject({ err, msg: Error('Failed to post to Twitter.'), status });
                });
            } else {
                oa.post('https://api.twitter.com/1.1/statuses/update.json', oauth.token, oauth.secret, {
                    status: post.substring(0, 280),
                }, (e, data, res) => {
                    if (e) {
                        reject({ e, msg: Error('Failed to post to Twitter.'), status, res });
                    } else {
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            reject({ err, msg: Error('Failed to post to Twitter.'), status });
        }
    });
}

/**
 * loadToken - try to load authentication token and verify it is still valid
 *
 */
exports.refresh = function loadToken() {
    return new Promise((resolve, reject) => {
        if (oa !== null && twit !== null) {
            checkTokens(resolve, reject);
        } else {
            auth.getKeys('twitter').then((res) => {
                if (oa === null) oa = new OAuth('https://api.twitter.com/oauth/request_token', 'https://api.twitter.com/oauth/access_token', res.k, res.s, '1.0', 'oob', 'HMAC-SHA1');
                if (twit === null) {
                    twit = new twitterAPI({
                        consumerKey: res.k,
                        consumerSecret: res.s,
                        callback: 'oob',
                    });
                }

                checkTokens(resolve, reject);
            }).catch(() => {
                reject(false);
            });
        }
    });
};

function checkTokens(resolve, reject) {
    const storedToken = store.get('twitter');
    if (!storedToken) {
        reject(false);
        authorized = false;
    } else {
        twit.verifyCredentials(storedToken.token, storedToken.secret, undefined, (error, data, response) => {
            if (error) {
                reject(false);
            } else {
                oauth = storedToken;
                authorized = true;
                resolve(true);
            }
        });
    }
}

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
