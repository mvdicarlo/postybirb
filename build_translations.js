const fs = require('fs');

const assetsDir = `${__dirname}/src/assets/i18n/`;
const other = ['es.json'];
const contextFile = 'context.json';

/*
* Format
* { internal, english, context, translation }
*/

function loadContextFile() {
    const contextMap = {};
    const file = fs.readFileSync(`${assetsDir}context.json`);
    const json = JSON.parse(file);

    Object.keys(json).forEach((key) => {
        contextMap[key] = json[key];
    });

    return contextMap;
}


function loadEnglishFile() {
    const translationMap = {};
    const file = fs.readFileSync(`${assetsDir}en.json`);
    const json = JSON.parse(file);

    Object.keys(json).forEach((key) => {
        translationMap[key] = json[key];
    });

    return translationMap;
}

function loadOtherFiles() {
    const translationMap = {};

    other.forEach((filename) => {
        const file = fs.readFileSync(assetsDir + filename);
        const json = JSON.parse(file);

        Object.keys(json).forEach((key) => {
            if (!translationMap[key]) {
                translationMap[key] = json[key];
            }
        });
    });

    return translationMap;
}

const contextMap = loadContextFile();

const map = loadEnglishFile();
const translations = Object.keys(map).map((key) => {
    const obj = {
        Internal: key,
        'Translate Me': map[key],
    };

    if (contextMap[key] && contextMap[key].length) {
        obj.Context = contextMap[key];
    }

    obj.Translated = "";

    return obj;
});

const otherMap = loadOtherFiles();
Object.keys(otherMap).forEach((key) => {
    if (!map[key]) {
        const obj = {
            Internal: key,
            Context: '',
            'Translate Me': key,
        };

        if (contextMap[key] && contextMap[key].length) {
            obj.Context = contextMap[key];
        } else {
          delete obj.Context;
        }

        obj.Translated = "";

        translations.push(obj);
    }
});

const all = translations.sort((a, b) => {
    if (a['Translate Me'] < b['Translate Me']) { return -1; }
    if (a['Translate Me'] > b['Translate Me']) { return 1; }
    return 0;
});

const header = `PostyBirb Translation Guide

Each text translation that occurs in PostyBirb is in this file.
Please put the relevant translation in the translation field. (Internal field should be ignored)
Please specify the language it is being translated to.

LANGUAGE: <Language being translated to>
TRANSLATOR: <Person to be credited>

PLEASE UNDERSTAND WHAT THE FIELDS MEAN

Internal: Just ignore this field. I use this for mapping it to the final translation file.
Context: Just some context for translators since some people have been confused about the purpose/context of the text. You do not need to translate this field.
Translate Me: The text you are translating.
Translated: The actual translation of Translate Me.

DO NOT TRANSLATE TEXT IN BRACKETS SUCH AS {{website}} or {{value}}
-----------------------------------------------------------------------`;

const buildString = `${all.map(t => JSON.stringify(t, null, 2)).join('\n\n')}\n\n`;

fs.writeFile('postybirb_translation_guide.txt', `${header}\n\n${buildString}`, 'utf8', () => { console.log('done'); });
