
module.exports = {
    auth_server: 'https://postybirb-auth-server.now.sh',

    generateAuthUrl(path) {
        return this.auth_server + path;
    },
};
