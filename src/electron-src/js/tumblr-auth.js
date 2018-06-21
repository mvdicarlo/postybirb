const tumblr = require('./tumblr.js');
const oauth = require('oauth').OAuth;
const express = require('express');
const fs = require('fs');
const auth = require('./auth-server');

let client = null;

/**
 * tumblr functions
 */
const action = {
    failed() {
        client = null;
        tumblrExpress.stop();
    },
};

/**
 * Temp holder for authorization
 */
const tempInfo = {};

/**
 * user information
 */
let user = {
    name: '',
    blogs: [],
};

/**
 * Tumblr express server
 */
let tumblrExpress = {
    app: null,
    server: null,
    start() {
        if (!this.app) {
            this.app = express();
            this.server = this.app.listen(4200);

            this.app.get('/tumblr', (req, res) => {
                // Authorize

                $.post(auth.generateAuthUrl('/tumblr/authorize'), { oauth_token: req.query.oauth_token, secret: tempInfo.secret, oauth_verifier: req.query.oauth_verifier })
                .done((r) => {
                    user.secret = r.accessSecret;
                    user.token = r.accessToken;
                    createTumblrClient({
                        consumer_key: r.k,
                        consumer_secret: r.s,
                        token: r.accessToken,
                        token_secret: r.accessSecret,
                    });
                    res.send('Tumblr successfully authenticated. You are free to close this window now.');
                }).fail(() => {
                    res.send('Tubmlr failed to authenticate. Auth server may be down.');
                });

                this.stop();
            });
        }
    },
    stop() {
        if (this.server) this.server.close();
        this.server = null;
        this.app = null;
    },
};

/**
 * createTumblrClient - Try to create client from authentication process
 *
 * @param  {object} keys information necessary for client creation
 */
function createTumblrClient(keys) {
    return new Promise((resolve, reject) => {
        client = tumblr.createClient(keys);
        client.userInfo((err, res) => {
            if (err) {
                action.failed();
                reject(false);
            } else {
                // Get user information
                user.name = res.user.name;
                user.blogs = res.user.blogs;
                store.set('tumblr', user, new Date().setMonth(new Date().getMonth() + 2));
                resolve(true);
            }
        });
    });
}

function getUserBlogs() {
    return user.blogs;
}

function getUser() {
    return user.name;
}

/**
 * isAuthenticated - return whether client is authenticated
 *
 * @return {boolean}  is authenticated
 */
function isAuthenticated() {
    return !!client;
}

/**
 * postToTumblr - Try to post to Tumblr
 *
 * @param  {base64} base64 file in b64 format for submitting
 */
function postToTumblr(blog, submissionTags, title, description, type, base64) {
    return new Promise((resolve, reject) => {
        try {
            if (!isAuthenticated()) {
                reject(Error('Not Authorized'));
                return;
            }

            const postObj = {
                caption: `${description}`,
                tags: submissionTags,
            };

            if (base64.length > 1) {
                postObj.data = base64.map((file) => {
                    if (file instanceof Buffer) {
                        // stupid hack to get the read stream working correctly because I can't figure out a better way
                        const tmpName = `${window.documentsPath}/PostyBirb/temp/${Date.now()}.temp`;
                        fs.writeFileSync(tmpName, file);
                        const rs = fs.createReadStream(tmpName);
                        fs.unlink(tmpName);
                        return rs;
                    }
                    return fs.createReadStream(file);
                });
            } else if (base64 instanceof Array) {
                postObj.data64 = base64[0].toString('base64');
            }

            if (type === 'photo') {
                client.createPhotoPost(blog, postObj,
                (err, res) => {
                    if (err) {
                        action.failed();
                        reject({ err, msg: Error('Failed to post to Tumblr.'), status });
                    } else {
                        resolve(true);
                    }
                });
            } else if (type === 'audio') {
                client.createAudioPost(blog, postObj,
                (err, res) => {
                    if (err) {
                        action.failed();
                        reject({ err, msg: Error('Failed to post to Tumblr.'), status });
                    } else {
                        resolve(true);
                    }
                });
            } else if (type === 'video') {
                client.createVideoPost(blog, postObj,
                (err, res) => {
                    if (err) {
                        action.failed();
                        reject({ err, msg: Error('Failed to post to Tumblr.'), status });
                    } else {
                        resolve(true);
                    }
                });
            } else if (type === 'text') {
                client.createTextPost(blog, { title, body: description, tags: submissionTags },
                  (err, res) => {
                      if (err) {
                          action.failed();
                          reject({ err, msg: Error('Failed to post to Tumblr.'), status });
                      } else {
                          resolve(true);
                      }
                  });
            }
        } catch (err) {
            reject({ err, msg: Error('Failed to post to Tumblr.'), status });
        }
    });
}

/**
 * authenticateTumblr - Try to authenticate tumblr
 *
 */
exports.authorize = function authenticateTumblr() {
    client = null;

    return new Promise((resolve) => {
        $.get(auth.generateAuthUrl('/tumblr/authorize'))
        .done((res) => {
            tempInfo.token = res.token;
            tempInfo.secret = res.secret;
            resolve(res.url);
            tumblrExpress.start();
        })
        .fail(() => {
            resolve(null);
        });
    });
};

/**
 * loadToken - try to load authentication token and verify it is still valid
 * @return {Promise}         key value
 */
exports.refresh = function loadToken() {
    const storedToken = store.get('tumblr');
    if (!storedToken) return;

    user = storedToken;
    return new Promise((resolve, reject) => {
        auth.getKeys('tumblr').then((res) => {
            resolve(createTumblrClient({
                consumer_key: res.k,
                consumer_secret: res.s,
                token: user.token,
                token_secret: user.secret,
            }));
        }).catch(() => {
            reject(false);
        });
    });
};

/**
 * unauthorize - unauthorizes tumblr
 *
 */
exports.unauthorize = function unauthorize() {
    store.remove('tumblr');
    user = {};
};

exports.post = function post(blog, tags, title, description, type, buffers) {
    return postToTumblr(blog, tags, title, description, type, buffers || false);
};

exports.stop = tumblrExpress.stop;
exports.isAuthorized = isAuthenticated;
exports.getBlogs = getUserBlogs;
exports.getUsername = getUser;
