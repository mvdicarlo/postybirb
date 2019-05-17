module.exports = {
  auth_server: 'https://postybirb-auth.now.sh',

  generateAuthUrl(path) {
    return this.auth_server + path;
  },
};
