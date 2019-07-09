const auth = require('./auth-server');
const request = require('request');
const Mastodon = require('mastodon-api');

function getAccessTokens(website, code) {
  return new Promise((resolve, reject) => {
    request.post({
      url: auth.generateAuthUrl(`/mastodon/v1/authorize/${encodeURIComponent(website)}`),
      form: {
        code
      }
    }, (error, response, body) => {
      if (error || response.statusCode === 500 || response.statusCode === 400) {
        reject(false);
      } else {
        const M = new Mastodon({
          access_token: body,
          api_url: `${website}/api/v1/`,
        });

        getUsernameFromAPI(M, body).then((username) => {
          const data = {
            token: body,
            username,
            website
          };
          resolve(data);
        }).catch(() => {
          resolve(false);
        });
      }
    });
  });
}

exports.authorize = getAccessTokens;

function getUsernameFromAPI(mastodonInstance, token) {
  return new Promise((resolve, reject) => {
    mastodonInstance.get('accounts/verify_credentials', {}).then((res) => {
      resolve(res.data.username);
    }).catch(() => {
      unauthorizeMastodon();
      reject(false);
    });
  });
}

exports.getAuthorizationURL = function getURL(website) {
  return auth.generateAuthUrl(`/mastodon/v1/authorize/${encodeURIComponent(website)}`);
};

exports.refresh = function refresh(website, token) {
  return new Promise((resolve, reject) => {
    const M = new Mastodon({
      access_token: token,
      api_url: `${website}/api/v1/`,
    });

    resolve(true);
  });
};

function uploadMedia(media, token, website) {
  return new Promise((resolve, reject) => {
    const formData = {
      file: media,
    };

    request.post({
      url: `${website}/api/v1/media`,
      headers: {
        Accept: '*/*',
        'User-Agent': 'node-mastodon-client',
        Authorization: `Bearer ${token}`,
      },
      formData,
    }, (err, resp, body) => {
      try {
        const json = JSON.parse(body);
        if (err || json.errors) {
          reject(err || json.errors);
        } else {
          resolve(json.id);
        }
      } catch (e) {
        reject(err + ' - ' + body);
      }
    });
  });
}

async function uploadMedias(files, token, website) {
  const ids = [];
  for (let i = 0; i < files.length; i++) {
    const id = await uploadMedia(files[i], token, website);
    ids.push(id);
  }

  return ids;
}

exports.post = function post(token, website, files, sensitive, status, spoilerText) {
  return new Promise((resolve) => {
    const M = new Mastodon({
      access_token: token,
      api_url: `${website}/api/v1/`,
    });

    const data = {
      status,
      sensitive,
    };

    if (spoilerText) {
      data.sensitive = true;
      data.spoiler_text = spoilerText;
    }

    if (files && files.length) { // submission w/ images
      uploadMedias(files.slice(0, 4), token, website)
        .then((media_ids) => {
          data.media_ids = media_ids;
          M.post('statuses', data).then((response) => {
            resolve(response.data);
          }).catch((err) => {
            resolve({
              error: err
            });
          });
        }).catch((err) => {
          resolve({
            error: err
          });
        });
    } else {
      M.post('statuses', data)
        .then((response) => {
          resolve(response.data);
        }).catch((err) => {
          resolve({
            error: err
          });
        });
    }
  });
};
