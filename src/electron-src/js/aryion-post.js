const request = require('request');
const session = require('electron').remote.session;

exports.post = function post(form) {
    return new Promise((resolve, reject) => {
        session.defaultSession.cookies.get({ url: 'https://aryion.com' }, (err, cookies) => {
            if (err) {
                reject(Error('Unable to retrieve cookies'));
            } else {
                const jar = request.jar();
                cookies.forEach((c) => {
                    const cookie = request.cookie(`${c.name}=${c.value}`);
                    jar.setCookie(cookie, 'https://aryion.com');
                });

                request.post('https://aryion.com/g4/itemaction.php', { jar, formData: form }, (e, res, body) => {
                    if (e) {
                        reject({
                            err: e,
                            msg: e,
                            form,
                        });
                    } else {
                        const json = res.toJSON();
                        if (json.statusCode === 200) {
                            resolve(body);
                        } else {
                            reject({
                                err: body,
                                msg: '',
                                form,
                            });
                        }
                    }
                });
            }
        });
    });
};
