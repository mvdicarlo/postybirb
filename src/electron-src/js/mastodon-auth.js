const auth = require('./auth-server');
const request = require('request');
const Mastodon = require('mastodon-api');

let authorized = false;
let oauth = null;
let M = null;

function getAccessTokens(code) {
    return new Promise((resolve, reject) => {
        request.post({ url: auth.generateAuthUrl('/mastodon/authorize'), form: { code } }, (error, response, body) => {
            if (error || response.status === 500) {
                reject(false);
            } else {
                if (!M) {
                    M = new Mastodon({
                        access_token: body,
                    });
                }

                getUsernameFromAPI(body).then((username) => {
                    oauth = { token: body, username };
                    db.set('mastodon', oauth).write();
                    authorized = true;
                    resolve(true);
                }).catch(() => {
                    unauthorizeMastodon();
                    resolve(false);
                });
            }
        });
    });
}

function unauthorizeMastodon() {
    db.unset('mastodon').write();
    authorized = false;
    oauth = null;
}

function getUsernameFromAPI(token) {
    return new Promise((resolve, reject) => {
        M.get('accounts/verify_credentials', {}).then((res) => {
            resolve(res.data.username);
        }).catch(() => {
            unauthorizeMastodon();
            reject(false);
        });
    });
}

function uploadMedia(media) {
    return new Promise((resolve, reject) => {
        const formData = {
            file: {
                value: media.buffer,
                options: {
                    filename: 'upload',
                    contentType: media.type,
                },
            },
        };

        request.post({
            url: 'https://mastodon.social/api/v1/media',
            headers: {
                Accept: '*/*',
                'User-Agent': 'node-mastodon-client',
                Authorization: `Bearer ${oauth.token}`,
            },
            formData,
        }, (err, resp, body) => {
            const json = JSON.parse(body);
            if (err || json.errors) {
                reject(err);
            } else {
                resolve(json.id);
            }
        });
    });
}

exports.post = function post(files, type, status, sensitive, spoilerText) {
    return new Promise((resolve, reject) => {
        if (type === 'Story') {
            M.post('statuses', { status })
            .catch((err) => {
                reject({ err, data: { status } });
            }).then(() => {
                resolve(true);
            });
        } else {
            const promises = files.slice(0, 4).map(f => uploadMedia(f));
            Promise.all(promises).then((ids) => {
                const data = { status, media_ids: ids, sensitive };
                if (spoilerText) data.spoiler_text = spoilerText;
                M.post('statuses', data).then(() => {
                    resolve(true);
                }).catch((err) => {
                    reject({ err, data: { status, sensitive, spoilerText, type } });
                });
            }).catch((err) => {
                reject({ err, data: { status, sensitive, spoilerText, type } });
            });
        }
    });
};

exports.refresh = function refresh() {
    return new Promise((resolve, reject) => {
        const storedToken = db.get('mastodon').value();
        if (!storedToken) {
            reject(false);
        } else {
            oauth = storedToken;
            authorized = true;

            if (!M) {
                M = new Mastodon({
                    access_token: oauth.token,
                });
            }

            resolve(true);
        }
    });
};

exports.getAuthorizationURL = function getURL() {
    return auth.generateAuthUrl('/mastodon/authorize');
};

exports.isAuthorized = function isAuthorized() {
    return authorized;
};

exports.getUsername = function getUsername() {
    return oauth ? oauth.username : null;
};

exports.authorize = getAccessTokens;
exports.unauthorize = unauthorizeMastodon;
