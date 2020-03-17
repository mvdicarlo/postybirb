const {
  remote
} = require('electron');
const {
  session,
  net
} = require('electron').remote;
const cookieParser = require('set-cookie-parser');
const FormData = require('form-data');
const UrlEncoded = require('form-urlencoded').default;

const agent = `${remote.getCurrentWebContents().getUserAgent()}`;

function getAgent(extended) {
  return extended ? `${agent} PostyBirb/${remote.app.getVersion()}` : agent;
}

function convertCookie(cookie) {
  const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path || ''}`;
  const expirationDate = new Date();
  const details = {
    domain: cookie.domain,
    httpOnly: cookie.httpOnly || false,
    name: cookie.name,
    secure: cookie.secure || false,
    url: url.replace('://.', '://'),
    value: cookie.value,
  };

  if (cookie.expirationDate) {
    details.expirationDate = expirationDate.setMonth(expirationDate.getMonth() + 4);
  }
  return details;
}

function setCookie(session, cookie) {
  return session.cookies.set(cookie)
    .catch(function(err) {
      if (err) {
        console.warn(err, this);
      }
    }.bind(cookie));
}

function appendFormValue(form, key, value) {
  if (value && value.hasOwnProperty('value') && value.hasOwnProperty('options')) {
    form.append(key, value.value, value.options);
  } else {
    form.append(key, value);
  }
}

exports.get = (url, partitionId, options) => {
  options = options || {};
  options.headers = options.headers || {};
  return new Promise((resolve, reject) => {
    const {
      headers
    } = options;
    const _session = session.fromPartition(`persist:${partitionId}`);
    if (!headers['User-Agent']) headers['User-Agent'] = getAgent(options.extendedAgent);
    if (options.cookies) headers['Cookie'] = options.cookies.map(c => `${c.name}=${c.value}`).join('; ')
    const request = net.request({
      headers,
      redirect: 'follow',
      session: _session,
      url,
    });

    request.end();
    request.on('response', async (response) => {
      const res = {
        body: (response.data || []).filter(d => !!d).map(d => d.toString()).join(),
        headers: response.headers,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
      };

      if (options.updateCookies && response.headers['set-cookie']) {
        const cookies = cookieParser.parse(response.headers['set-cookie']);
        for (let i = 0; i < cookies.length; i++) {
          await setCookie(_session, convertCookie(cookies[i]));
        }
      }

      resolve(res);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
};

exports.post = (url, partitionId, body, options) => {
  options = options || {};
  options.headers = options.headers || {};
  return new Promise((resolve, reject) => {
    const {
      headers
    } = options;
    const _session = session.fromPartition(`persist:${partitionId}`);
    if (!headers['User-Agent']) headers['User-Agent'] = getAgent(options.extendedAgent);
    if (options.cookies) headers['Cookie'] = options.cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const request = net.request({
      headers,
      method: options.method || 'POST',
      redirect: 'manual',
      session: _session,
      url,
    });

    request.chunkedEncoding = true;

    if (options.json) {
      const data = JSON.stringify(body);
      request.setHeader('Content-Length', data.length);
      if (!headers['Content-Type']) request.setHeader('Content-Type', 'application/json');
      request.write(data);
    } else if (options.multipart) {
      const form = new FormData();
      const keys = Object.keys(body);
      for (var i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = body[key];
        try {
          if (val instanceof Array) {
            for (let i = 0; i < val.length; i++) {
              appendFormValue(form, key, val[i]);
            }
          } else {
            appendFormValue(form, key, val);
          }
        } catch (err) {
          throw new Error(`${url}\nUnable to append form value ${key}=${val}\n${err.message}`);
        }
      }

      request.setHeader('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`);
      request.setHeader('Content-Length', form.getLengthSync());
      request.write(form.getBuffer());
    } else {
      const encoded = UrlEncoded(body);
      if (!headers['Content-Type']) request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      request.setHeader('Content-Length', (encoded || '').length);
      request.write(encoded);
    }

    request.end();

    let lastRedirect = '';
    request.on('redirect', (statusCode, method, redirectUrl, responseHeaders) => {
      lastRedirect = redirectUrl;
      request.followRedirect();
    });

    let response;
    request.on('response', (r) => {
      response = r;
    });

    request.on('close', async () => {
      const res = {
        body: (response.data || []).filter(d => !!d).map(d => d.toString()).join(),
        headers: response.headers,
        href: lastRedirect,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        success: response.statusCode <= 330, // assumed success
      };

      if (options.updateCookies && response.headers['set-cookie']) {
        const cookies = cookieParser.parse(response.headers['set-cookie']);
        for (let i = 0; i < cookies.length; i++) {
          await setCookie(_session, convertCookie(cookies[i]));
        }
      }

      resolve(res);
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
};
