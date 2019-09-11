const {
  remote,
} = require('electron');
const Got = require('got');
const Request = require('request');
const FormData = require('form-data');
const {
  CookieJar
} = require('tough-cookie');
const setCookie = require('set-cookie-parser');

const {
  session,
  net
} = require('electron').remote;

const agent = `${remote.getCurrentWebContents().getUserAgent()}`
const got = Got.extend({
  headers: {
    'User-Agent': agent
  }
});

const request = Request.defaults({
  headers: {
    'User-Agent': agent
  }
});

exports.crGet = function(url, headers, partition) {
  return new Promise((resolve, reject) => {
    headers['User-Agent'] = agent;
    const request = net.request({
      headers,
      partition: `persist:${partition}`,
      url,
      redirect: 'follow'
    });

    request.end();

    request.on('response', (response) => {
      const res = {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        body: (response.data || []).filter(d => !!d).map(d => d.toString()).join()
      };
      resolve(res);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

exports.crPost = function crPost(url, headers, partition, body, json, method) {
  return new Promise((resolve, reject) => {
    headers['User-Agent'] = agent;
    const request = net.request({
      method: method || 'POST',
      headers,
      partition: `persist:${partition}`,
      url,
      redirect: 'follow'
    });

    request.chunkedEncoding = true;

    if (json) {
      const data = JSON.stringify(body);
      request.setHeader('Content-Length', data.length);
      request.setHeader('Content-Type', 'application/json');
      request.write(data);
    } else {
      const form = new FormData();
      Object.keys(body).forEach((key) => {
        const val = body[key];
        if (val.options) { // assume file?
          form.append(key, val.value, val.options);
        } else {
          form.append(key, body[key]);
        }
      });

      request.setHeader('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`);
      request.setHeader('Content-Length', form.getLengthSync());
      request.write(form.getBuffer().toString());
    }
    request.end();

    request.on('response', (response) => {
      const res = {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        body: (response.data || []).filter(d => !!d).map(d => d.toString()).join()
      };
      resolve(res);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

exports.get = function get(url, cookieUrl, cookies, profileId, options) {
  return new Promise((resolve, reject) => {
    const cookieJar = new CookieJar();
    if (cookies && cookies.length) {
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        cookieJar.setCookie(`${cookie.name}=${cookie.value}`, cookieUrl, () => {});
      }
    }

    const opts = Object.assign({
      cookieJar
    }, options);

    got(url, opts)
      .then((res) => {
        if (res.headers['set-cookie'] && profileId) { // TODO: I think I only implemented this because of SoFurry. Might be worth removing this logic.
          const _cookies = setCookie.parse(res, {
            decodeValues: false
          });
          const cookieSession = session.fromPartition(`persist:${profileId}`).cookies;
          _cookies.forEach((c) => {
            c.domain = c.domain || res.request.gotOptions.host;
            const converted = _convertCookie(c);
            const now = new Date();
            converted.expirationDate = now.setMonth(now.getMonth() + 4); // add 4 months
            cookieSession.set(converted, function(err) {
              if (err) {
                console.warn(err, this);
              }
            }.bind(converted));
          });
        }
        resolve(res);
      }).catch((err) => {
        resolve(err);
      });
  });
};

// To be honest, Request is easier to use IMO since it has better option support than GOT.
exports.requestGet = function requestGet(url, cookieUrl, cookies, options) {
  return new Promise((resolve, reject) => {
    const cookieJar = request.jar();
    if (cookies && cookies.length) {
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        cookieJar.setCookie(request.cookie(`${cookie.name}=${cookie.value}`), cookieUrl);
      }
    }

    const opts = Object.assign({
      jar: cookieJar,
      followAllRedirects: true
    }, options || {});
    request.get(url, opts, (err, response, body) => {
      if (err) {
        resolve({
          error: err
        });
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

exports.patch = function patch(url, formData, cookieUrl, cookies, options) {
  return new Promise((resolve, reject) => {
    const cookieJar = request.jar();
    if (cookies && cookies.length) {
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        cookieJar.setCookie(request.cookie(`${cookie.name}=${cookie.value}`), cookieUrl);
      }
    }

    const opts = Object.assign({
      formData,
      jar: cookieJar,
      followAllRedirects: true
    }, options || {});
    request.patch(url, opts, (err, response, body) => {
      if (err) {
        resolve({
          error: err
        });
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

exports.post = function post(url, formData, cookieUrl, cookies, options) {
  return new Promise((resolve, reject) => {
    const cookieJar = request.jar();
    if (cookies && cookies.length) {
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        cookieJar.setCookie(request.cookie(`${cookie.name}=${cookie.value}`), cookieUrl);
      }
    }

    const opts = Object.assign({
      formData,
      followAllRedirects: true
    }, options || {});

    if (cookies) {
      Object.assign(opts, {
        jar: cookieJar,
      });
    }

    request.post(url, opts, (err, response, body) => {
      if (err) {
        resolve({
          error: err
        });
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

// NOTE: This was created just to make e621 work since e621 doesn't like request for some reason.
// Now that I know how to get files working it might be worthwhile looking into replacing the old stuff using request in the future
exports.gotPost = function gotPost(url, formData, cookieUrl, cookies, options) {
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
      const val = formData[key];
      if (val.options) { // assume file?
        form.append(key, val.value, val.options);
      } else {
        form.append(key, formData[key]);
      }
    });

    const opts = Object.assign({
      body: form,
      cookieJar,
      followRedirect: true
    }, options);
    got.post(url, opts)
      .then((res) => {
        resolve(res);
      }).catch((err) => {
        resolve(err); // got seems to throw a lot despite a successful post
      });
  });
};

function _convertCookie(cookie) {
  const url = `${(cookie.secure) ? 'https' : 'http'}://${cookie.domain}${cookie.path || ''}`;
  const {
    name,
    value,
    domain,
    path,
    secure,
    httpOnly
  } = cookie;
  return {
    url,
    name,
    value: value,
    domain,
    path,
    secure: secure || false,
    httpOnly: httpOnly || false
  };
}

exports.convertCookie = _convertCookie;
