
module.exports = {
    auth_server: '', // Stripped out for Public Release

    generateAuthUrl(path) {
        return this.auth_server + path;
    },

    getKeys(website) {
        const now = Date.now();
        return new Promise((resolve, reject) => {
            $.post(this.generateAuthUrl(`/${website}/keys`), { timestamp: now })
            .done((res) => {
                const buf = Buffer.from(res.data, 'base64');
                for (let i = 0; i < buf.length; i++) {
                    buf[i] = buf[i] ^ now;
                }

                resolve(JSON.parse(buf.toString('utf8')));
            }).fail(() => {
                reject(null);
            });
        });
    },
};
