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
            getAccessToken(req.query.code);
        });
    },
    stop() {
        if (this.server) this.server.close();
        this.server = null;
        this.app = null;
    },
};

function getAccessToken(code) {
    $.post(auth.generateAuthUrl('/deviantart/accesstoken'), { code })
    .done((res) => {
        token.accessToken = JSON.parse(res.body);
        deviantArtExpress.stop();
        getUser().then((userInfo) => {
            token.user = userInfo;
            setToken();
        }, () => {
            setToken();
        });
    }).fail(() => {
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
        checkTokens(resolve, reject, storedToken);
    });
}

function checkTokens(resolve, reject, storedToken) {
    $.get(`https://www.deviantart.com/api/v1/oauth2/placebo?access_token=${storedToken.accessToken.access_token}`)
      .done((res) => {
          if (res.status === 'success') {
              token = storedToken;
              resolve(true);
          } else {
              $.post(auth.generateAuthUrl('/deviantart/refresh'), { refresh_token: storedToken.accessToken.refresh_token })
              .done((resp) => {
                  token = storedToken;
                  token.accessToken = JSON.parse(resp.body);
                  setToken();
                  resolve(true);
              }).fail(() => {
                  store.remove('deviantart');
                  reject(false);
              });
          }
      }).fail(() => {
          $.post(auth.generateAuthUrl('/deviantart/refresh'), { refresh_token: storedToken.accessToken.refresh_token })
          .done((res) => {
              token = storedToken;
              token.accessToken = JSON.parse(res.body);
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
        deviantArtExpress.start();
        resolve(auth.generateAuthUrl('/deviantart/authorize'));
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
    if (!storedToken) {
        return new Promise((resolve, reject) => {
            reject(Error('No token'));
        });
    }

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
