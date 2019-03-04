const session = require('electron').remote.session;
const request = require('request');

exports.post = function post(data, optsData) {
    return new Promise((resolve, reject) => {
        session.defaultSession.cookies.get({ url: 'https://www.newgrounds.com' }, (err, cookies) => {
            if (err) {
                reject(Error('Unable to retrieve cookies'));
            } else {
                const jar = request.jar();
                cookies.forEach((c) => {
                    const cookie = request.cookie(`${c.name}=${c.value}`);
                    jar.setCookie(cookie, 'https://www.newgrounds.com');
                });

                request.post('https://www.newgrounds.com/parkfile', {
                  jar,
                  formData: data,
                  headers: {
                    'Origin': 'https://www.newgrounds.com',
                    'Referer': `https://www.newgrounds.com/art/submit/create`,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                    'TE': 'Trailers',
                    'X-Requested-With': 'XMLHttpRequest'
                  }
                }, (e, res, body) => {
                    if (e) {
                        reject({
                            err: e,
                            msg: e,
                            data,
                        });
                    } else {
                      if (res.statusCode === 200) {
                        const json = JSON.parse(body);
                        if (!json.success) {
                          reject({
                              err: body,
                              msg: body,
                              data,
                          });
                          return;
                        }

                        optsData.parked_id = json.parked_id;
                        optsData.parked_url = json.parked_url;

                        const jar = request.jar();
                        res.headers['set-cookie'].map(c => {
                          const cookie = request.cookie(c);
                          jar.setCookie(cookie, 'https://www.newgrounds.com');
                        });
                        delete data.file_path;
                        request.post('https://www.newgrounds.com/art/submit/create', {
                          jar,
                          formData: optsData,
                          qsStringifyOptions: { arrayFormat: 'repeat' },
                          headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Origin': 'https://www.newgrounds.com',
                            'Referer': `https://www.newgrounds.com/art/submit/create`,
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept': '*',
                            'Content-Type': 'multipart/form-data',
                            'TE': 'Trailers'
                          }
                        }, (e, res, body) => {
                            if (e) {
                                reject({
                                    err: e,
                                    msg: e,
                                    data,
                                });
                            } else {
                              if (res.statusCode === 200) {
                                try {
                                  const json = JSON.parse(body);
                                  if (json.url) {
                                    resolve({ data: null, res: json.url });
                                  } else {
                                    reject({ data: null, err: body, msg: body });
                                  }
                                } catch (err) {
                                  reject({ data: null, err, msg: body });
                                }
                              } else {
                                reject({ data: null, err: body, msg: body });
                              }
                            }
                        });
                      }
                    }
                });
            }
        });
    });
};
