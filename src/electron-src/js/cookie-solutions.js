const electron = require('electron');
const cookies = electron.remote.session.defaultSession.cookies;

cookies.on('changed', (event, cookie, cause, removed) => {
  // Derpibooru fix
  if (cookie.domain.includes('derpibooru')) {
    if (cookie.name == '_booru_fpr' && cookie.session && !removed) {
      const c = {
        url: 'https://derpibooru.org',
        name: cookie.name,
        hostOnly: false,
        httpOnly: false,
        domain: cookie.domain,
        secure: false,
        session: false,
        expirationDate: 999999999999999,
        path: cookie.path,
        value: cookie.value
      }

      cookies.set(c, (err) => {
        if (err) {
          console.log(err)
        }
      });
    }
  }
});
