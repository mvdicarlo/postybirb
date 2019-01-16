const express = require('express');
const auth = require('./auth-server');
const request = require('request');

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
const tumblrExpress = {
    app: null,
    server: null,
    start: function start() {
        if (!this.server) {
            this.app = express();
            this.server = this.app.listen(4200);

            this.app.get('/tumblr', (req, res) => {
                // Authorize
                user = { name: '', blogs: [] };
                $.post(auth.generateAuthUrl('/tumblr/authorize'), { oauth_token: req.query.oauth_token, secret: tempInfo.secret, oauth_verifier: req.query.oauth_verifier })
                .done((r) => {
                    user.secret = r.accessSecret;
                    user.token = r.accessToken;
                    user.blogs = r.data.user.blogs;
                    user.name = r.data.user.name;
                    db.set('tumblr', user).write();
                    res.send('Tumblr successfully authenticated. You are free to close this window now.');
                    this.stop();
                }).fail(() => {
                    res.send('Tumblr failed to authenticate. Auth server may be down.');
                    this.stop();
                });
            });
        }
    },
    stop: function stop() {
        if (this.server) this.server.close();
        this.server = null;
        this.app = null;
    },
};

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
    return !!user.token;
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

            const formData = new FormData();
            formData.append('body', description);
            formData.append('tags', submissionTags);
            formData.append('blog', blog);
            formData.append('type', type);
            formData.append('title', title);
            formData.append('token', user.token);
            formData.append('secret', user.secret);

            if (base64 && base64.length > 0) {
                base64.forEach(f => formData.append('data', f));
            }

            $.ajax({
                url: auth.generateAuthUrl('/tumblr/post'),
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                error(err) {
                    reject({ err, msg: err, data: { blog, submissionTags, title, description, type }, notify: true });
                },
                success() {
                    resolve(true);
                },
            });
        } catch (err) {
            reject({ err, data: { blog, submissionTags, title, description, type } });
        }
    });
}

/**
 * authenticateTumblr - Try to authenticate tumblr
 *
 */
exports.authorize = function authenticateTumblr() {
    return new Promise((resolve) => {
        $.get(auth.generateAuthUrl('/tumblr/authorize'))
        .done((res) => {
            tempInfo.token = res.token;
            tempInfo.secret = res.secret;
            tumblrExpress.start();
            resolve(res.url);
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
    const storedToken = db.get('tumblr').value();
    if (!storedToken) return;
    user = storedToken;

    return new Promise((resolve, reject) => {
        if (!user.token || !user.secret) {
            user = {};
            db.unset('tumblr').write();
            reject(false);
            return;
        }

        request.post({ url: auth.generateAuthUrl('/tumblr/refresh'), form: { token: user.token, secret: user.secret } }, (error, response, body) => {
            if (error) {
                db.unset('tumblr').write();
                user = {};
                reject(false);
            } else {
                const res = JSON.parse(body);
                if (res && res.user) {
                  user.name = res.user.name;
                  user.blogs = res.user.blogs;
                  db.set('tumblr', user).write();
                  resolve(true);
                } else {
                  db.unset('tumblr').write();
                  user = {};
                  reject(false);
                }
            }
        });
    });
};

/**
 * unauthorize - unauthorizes tumblr
 *
 */
exports.unauthorize = function unauthorize() {
    db.unset('tumblr').write();
    user = {};
};

exports.post = function post(blog, tags, title, description, type, buffers) {
    return postToTumblr(blog, tags, title, description, type, buffers || false);
};

exports.stop = function() {
    tumblrExpress.stop();
};
exports.start = tumblrExpress.start;
exports.isAuthorized = isAuthenticated;
exports.getBlogs = getUserBlogs;
exports.getUsername = getUser;
