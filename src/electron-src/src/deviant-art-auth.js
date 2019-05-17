const express = require('express');
const auth = require('./auth-server');
const request = require('request');

const app = express();
const expressPort = 4200;
let server = null;
let cb = null;

exports.start = function(callback) {
  cb = callback;
  if (!server) {
    server = app.listen(expressPort);
  }
};

exports.stop = function() {
  if (server) {
    server.close();
  }

  server = null;
};

exports.getAuthURL = function() {
  return auth.generateAuthUrl('/deviant-art/v1/authorize');
};

exports.refresh = function(authInfo, forceRenew) {
  const created = new Date(authInfo.created || 0);
  const expire = created.setHours(created.getHours() + 1); // this should be the expiration time

  let shouldRenew = false;
  const diff = expire - (Date.now() + (6 * 60000)); // should be negative if expiring in the next 6 minutes
  if (diff <= 0) shouldRenew = true;

  if (shouldRenew || forceRenew) {
    return renew(authInfo);
  }

  return new Promise((resolve, reject) => {
    request.get(`https://www.deviantart.com/api/v1/oauth2/placebo?access_token=${authInfo.access_token}`, (err, response, body) => {
      if (err) {
        resolve(false);
        return;
      }

      try {
        const placebo = JSON.parse(body);
        if (placebo.status === 'success') {
          resolve(authInfo);
        } else {
          renew(authInfo)
            .then((info) => {
              resolve(info);
            }).catch(() => {
              resolve(false);
            });
        }
      } catch (e) {
        // could happen on DA api downtime
        resolve(false);
      }
    });
  });
};

function renew(authInfo) {
  return new Promise((resolve, reject) => {
    request.post(auth.generateAuthUrl('/deviant-art/v1/refresh'), {
      json: {
        refresh_token: authInfo.refresh_token,
      },
    }, (err, response, body) => {
      if (err) {
        resolve(false);
        return;
      }

      try {
        const json = body;
        if (json.errors || json.error) {
          resolve(false);
        } else {
          authInfo.created = Date.now();
          resolve(Object.assign(authInfo, json));
        }
      } catch (e) {
        resolve(false);
      }
    });
  });
}

app.get('/deviantart', (req, res) => {
  res.redirect('https://www.deviantart.com');
  getAccessToken(req.query.code);
});

function getAccessToken(code) {
  request.post(auth.generateAuthUrl('/deviant-art/v1/authorize'), {
    json: {
      code
    }
  }, (err, response, body) => {
    if (err) {
      cb(null);
    } else {
      const json = body;
      request.get(`https://www.deviantart.com/api/v1/oauth2/user/whoami?mature_content=true&access_token=${json.access_token}`, (err, response, body) => {
        if (err) {
          cb(null);
        } else {
          const info = Object.assign(json, JSON.parse(body));
          info.created = Date.now();
          cb(info);
        }
      });
    }
  });
}
