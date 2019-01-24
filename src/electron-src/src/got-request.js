const got = require('got');
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
    .then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}
