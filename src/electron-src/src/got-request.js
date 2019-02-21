const got = require('got');
const request = require('request');
const FormData = require('form-data');
const { CookieJar } = require('tough-cookie');

exports.get = function get(url, cookieUrl, cookies) {
    return new Promise((resolve, reject) => {
        const cookieJar = new CookieJar();
        if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                cookieJar.setCookie(`${cookie.name}=${cookie.value}`, cookieUrl, () => {});
            }
        }

        got(url, { cookieJar })
    .then((res) => {
        resolve(res);
    }).catch((err) => {
        reject(err);
    });
    });
};

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

exports.requestPost = function requestPost(url, formData, cookieUrl, cookies) {
    return new Promise((resolve, reject) => {
        const cookieJar = request.jar();
        if (cookies && cookies.length) {
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                cookieJar.setCookie(request.cookie(`${cookie.name}=${cookie.value}`), cookieUrl);
            }
        }

        request.post(url, { formData, jar: cookieJar, followAllRedirects: true }, (err, response, body) => {
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
