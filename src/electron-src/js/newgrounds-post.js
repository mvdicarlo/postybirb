const session = require('electron').remote.session;
const request = require('request');

exports.post = function post(data) {
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

                request.post('https://www.newgrounds.com/art/submit/uploadImage', {
                  jar,
                  formData: data,
                  gzip: true,
                  headers: {
                    'Origin': 'https://www.newgrounds.com',
                    'Referer': `https://www.newgrounds.com/art/submit/create`,
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Content-Type': 'multipart/form-data'
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
                        const jar = request.jar();
                        res.headers['set-cookie'].map(c => {
                          const cookie = request.cookie(c);
                          jar.setCookie(cookie, 'https://www.newgrounds.com');
                        });
                        delete data.file_path;
                        request.post('https://www.newgrounds.com/art/submit/create', {
                          jar,
                          formData: data,
                          headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Origin': 'https://www.newgrounds.com',
                            'Referer': `https://www.newgrounds.com/art/submit/create`,
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept': '*',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
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
                                    resolve({ data, res: json.url });
                                  } else {
                                    reject({ data, err: body, msg: body });
                                  }
                                } catch (err) {
                                  reject({ data, err, msg: body });
                                }
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
