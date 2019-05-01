const fs = require('fs');

const fileName = 'jatranslation.json';
const language = 'ja';

function loadTranslationFile() {
  return JSON.parse(fs.readFileSync(`${__dirname}/${fileName}`, 'utf8')) || {};
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(`${__dirname}/src/assets/i18n/${language}.json`, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

const existingTranslations = loadExisting()
const newTranslations = loadTranslationFile();

newTranslations.forEach(t => {
  const existing = existingTranslations[t.Internal];
  if (t.Translated && t.Translated !== "" && t.Translated !== undefined) {
    existingTranslations[t.Internal] = t.Translated;
  }
});

const translation = JSON.stringify(existingTranslations, null, 1);
console.log(translation);

fs.writeFileSync(`${__dirname}/src/assets/i18n/${language}.json`, translation);
