module.exports = {
  auth_server: 'https://postybirb-auth.cleverapps.io',

  generateAuthUrl(path) {
    return this.auth_server + path;
  },
};
