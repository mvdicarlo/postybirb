const session = require('electron').remote.session;
const request = require('request');
const zlib = require('zlib');

exports.post = function post(data) {
    return new Promise((resolve, reject) => {
        session.defaultSession.cookies.get({ url: 'https://aminoapps.com' }, (err, cookies) => {
            if (err) {
                reject(Error('Unable to retrieve cookies'));
            } else {
                const jar = request.jar();
                cookies.forEach((c) => {
                    const cookie = request.cookie(`${c.name}=${c.value}`);
                    jar.setCookie(cookie, 'https://aminoapps.com');
                });

                request.post('https://aminoapps.com/api/blog', {
                  jar,
                  json: data,
                  encoding: null,
                  headers: {
                    'X-Requested-With': 'xmlhttprequest',
                    'Host': 'aminoapps.com',
                    'Origin': 'https://aminoapps.com',
                    'Referer': `https://aminoapps.com/partial/compose-post?ndcId=${data.ndcId}&type=create`,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': '*/*',
                    'Content-Type': 'application/json'
                  }
                }, (e, res, body) => {
                  data.ndcId = '';
                    if (e) {
                        reject({
                            err: e,
                            msg: e,
                            data,
                        });
                    } else {
                      zlib.gunzip(body, (err, content) => {
                        if (err) {
                          reject(err);
                        } else {
                          const json = JSON.parse(content.toString());
                          if (json.code === 200) {
                              resolve(json);
                          } else {
                              reject({
                                  err: content.toString(),
                                  msg: '',
                                  data,
                              });
                          }
                        }
                      });
                    }
                });
            }
        });
    });
};
