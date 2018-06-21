const express = require('express');
const auth = require('./auth-server');

/**
 * URL paths for authentication
 */
const deviantArtAuthURL = {
    authorize: 'https://www.deviantart.com/oauth2/authorize?',
    accessToken: 'https://www.deviantart.com/oauth2/token',
    stash: 'https://www.deviantart.com/api/v1/oauth2/stash/submit',
    publish: 'https://www.deviantart.com/api/v1/oauth2/stash/publish',
};

/**
 * Storage for access token and code
 */
let token = {
    code: null,
    accessToken: null,
    user: null,
};

let config = null;

/**
 * Express server for authentication callbacks
 */
const deviantArtExpress = {
    app: null,
    server: null,
    start() {
        if (!this.server) {
            this.app = express();
            this.server = this.app.listen(4200);
        }

        this.app.get('/deviantart', (req, res) => {
            token.code = req.query.code;
            res.redirect('https://www.deviantart.com');

            if (config === null) {
                auth.getKeys('deviantart').then((r) => {
                    config = {
                        client_id: r.k,
                        client_secret: r.s,
                    };

                    getAccessToken(req.query.code);
                }).catch(() => {
                    deviantArtExpress.stop();
                });
            } else {
                getAccessToken(req.query.code);
            }
        });
    },
    stop() {
        if (this.server) this.server.close();
        this.server = null;
        this.app = null;
    },
};

function getAccessToken(code) {
    $.post(deviantArtAuthURL.accessToken, {
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:4200/deviantart',
    }).done((res) => {
        token.accessToken = res;
        deviantArtExpress.stop();
        getUser().then((userInfo) => {
            token.user = userInfo;
            setToken();
        }, () => {
            // Error?
            setToken();
        });
    })
    .fail(() => {
        deviantArtExpress.stop();
    });
}

function setToken() {
    store.set('deviantart', token, new Date().setMonth(new Date().getMonth() + 2));
}

function getUser() {
    return new Promise((resolve, reject) => {
        $.get(`https://www.deviantart.com/api/v1/oauth2/user/whoami?mature_content=true&access_token=${token.accessToken.access_token}`).done((res) => {
            resolve(res);
        }).fail(() => {
            reject(false);
        });
    });
}

function refreshToken(storedToken) {
    return new Promise((resolve, reject) => {
        if (config === null) {
            auth.getKeys('deviantart').then((res) => {
                config = {
                    client_id: res.k,
                    client_secret: res.s,
                };

                checkTokens(resolve, reject, storedToken);
            }).catch(() => {
                reject(false);
            });
        } else {
            checkTokens(resolve, reject, storedToken);
        }
    });
}

function checkTokens(resolve, reject, storedToken) {
    $.get(`https://www.deviantart.com/api/v1/oauth2/placebo?access_token=${storedToken.accessToken.access_token}`)
      .done((res) => {
          if (res.status === 'success') {
              token = storedToken;
              resolve(true);
          } else {
              reject(false);
          }
      }).fail(() => {
          $.post('https://www.deviantart.com/oauth2/token', {
              grant_type: 'refresh_token',
              client_id: config.client_id,
              client_secret: config.client_secret,
              refresh_token: storedToken.accessToken.refresh_token,
          }).done((res) => {
              token = storedToken;
              token.accessToken = res;
              setToken();
              resolve(true);
          }).fail(() => {
              store.remove('deviantart');
              reject(false);
          });
      });
}

function getToken() {
    return token.accessToken.access_token || undefined;
}

/**
 * getUserFolders - Get the user's submission folders
 *
 */
exports.getUserFolders = function getUserFolders() {
    return new Promise((resolve, reject) => {
        $.get(`https://www.deviantart.com/api/v1/oauth2/gallery/folders?calculate_size=false&access_token=${token.accessToken.access_token}`)
        .done((res) => {
            resolve(res.results);
        }).fail(() => {
            reject(null);
        });
    });
};

/**
 * isAuthenticated - return authentication status
 *
 * @return {boolean}  is authenticated
 */
function isAuthenticated() {
    return !!token.accessToken;
}

/**
 * authorizeDeviantArt - Try to authorize Deviant Art
 *
 */
exports.authorize = function authorizeDeviantArt() {
    token.accessCode = null;
    return new Promise((resolve) => {
        $.get(auth.generateAuthUrl('/deviantart/authorize'))
        .done((res) => {
            deviantArtExpress.start();
            resolve(res.url);
        }).fail(() => {
            resolve('');
        });
    });
};

exports.getUserInfo = function getUserInfo() {
    return token.user;
};

/**
 * loadToken - try to load authentication token and verify it is still valid
 *
 */
exports.refresh = function loadToken() {
    const storedToken = store.get('deviantart');
    if (!storedToken) return;

    return refreshToken(storedToken);
};

/**
 * unauthorize - unauthorize deviant art
 *
 */
exports.unauthorize = function unauthorize() {
    store.remove('deviantart');
    token = {};
};

exports.isAuthorized = isAuthenticated;
exports.getAuthorizationToken = getToken;
exports.stop = deviantArtExpress.stop;
