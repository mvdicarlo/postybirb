import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import backend from 'i18next-electron-fs-backend';

i18n
  .use(backend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: 'lang/{{lng}}/default.json',
      addPath: 'lang/{{lng}}/default.missing.json',
      // for some reason settings this value to anything else breaks app
      contextBridgeApiKey: 'api', // needs to match first parameter of contextBridge.exposeInMainWorld in preload file; defaults to "api"
    },

    debug: true,

    saveMissing: true,

    // allow keys to be phrases having `:`, `.`
    nsSeparator: ':',
    keySeparator: false,

    fallbackLng: 'en',
  });

export default i18n;
