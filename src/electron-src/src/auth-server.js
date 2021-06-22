module.exports = {
  auth_server: 'https://postybirb-auth.azurewebsites.net',

  generateAuthUrl(path) {
    return this.auth_server + path;
  },
};
