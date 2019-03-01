const got = require('got');
const request = require('request');
const FormData = require('form-data');
const { CookieJar } = require('tough-cookie');
const setCookie = require('set-cookie-parser');

const { session } = require('electron').remote;

exports.get = function get(url, cookieUrl, cookies, profileId, options) {
    return new Promise((resolve, reject) => {
        const cookieJar = new CookieJar();
        if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                cookieJar.setCookie(`${cookie.name}=${cookie.value}`, cookieUrl, () => {});
            }
        }

        const opts = Object.assign({ cookieJar }, options);

        got(url, opts)
          .then((res) => {
              if (res.headers['set-cookie']) {
                const cookies = setCookie.parse(res);
                const cookieSession = session.fromPartition(`persist:${profileId}`).cookies;
                cookies.filter(c => c.domain).forEach(c => {
                  c.secure = false;
                  c.session = false;
                  c.httpOnly = false;
                  c.hostOnly = false;
                  c.url = cookieUrl;
                  if (c.expires) {
                    delete c.expires;
                  }
                  c.value = encodeURIComponent(c.value);
                  c.expirationDate = 999999999999999;
                  cookieSession.set(c, function(err) {
                    if (err) {
                      console.warn(err, this);
                    }
                  }.bind(c));
                });
              }
              resolve(res);
          }).catch((err) => {
              reject(err);
          });
    });
};

// best not to use right now since it sorta doesnt work with electron
exports.post = function post(url, formData, cookieUrl, cookies) {
    return new Promise((resolve, reject) => {
        const cookieJar = new CookieJar();
        if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                cookieJar.setCookie(`${cookie.name}=${cookie.value}`, cookieUrl, () => {});
            }
        }

        const form = new FormData();
        Object.keys(formData).forEach((key) => {
            form.append(key, formData[key]);
        });

        got.post(url, { cookieJar, body: form })
          .then(success => resolve({ success }))
          .catch(error => resolve({ error }));
    });
};

exports.requestPost = function requestPost(url, formData, cookieUrl, cookies, options) {
    return new Promise((resolve, reject) => {
        const cookieJar = request.jar();
        if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                cookieJar.setCookie(request.cookie(`${cookie.name}=${cookie.value}`), cookieUrl);
            }
        }

        const opts = Object.assign({ formData, jar: cookieJar, followAllRedirects: true }, options || {});
        request.post(url, opts, (err, response, body) => {
            if (err) {
                resolve({ error: err });
            } else {
                resolve({
                    success: {
                        response,
                        body,
                    },
                });
            }
        });
    });
};
