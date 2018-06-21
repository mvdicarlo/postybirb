const fs = require('fs');
const assetsDir = __dirname + '/src/assets/i18n/';
const other = ['es.json'];


function loadEnglishFile() {
    const translationMap = {};
    const file = fs.readFileSync(assetsDir + 'en.json');
    const json = JSON.parse(file);
    
    Object.keys(json).forEach(key => {
        translationMap[key] = json[key];
    });
    
    return translationMap;
}

function loadOtherFiles() {
    const translationMap = {};
    
    other.forEach((filename) => {
        const file = fs.readFileSync(assetsDir + filename);
        const json = JSON.parse(file);
        
        Object.keys(json).forEach(key => {
            if (!translationMap[key]) {
                translationMap[key] = json[key];
            }
        });
    });
    
    return translationMap;
}

const map = loadEnglishFile();
const translations = Object.keys(map).map(key => {
    return map[key];
});

const otherMap = loadOtherFiles();
Object.keys(otherMap).forEach(key => {
    if (!map[key]) translations.push(key);
});

const all = translations.sort();

const header = `PostyBirb Translation Guide

Each text translation that occurs in PostyBirb is in this file.
Please put the relevant translation beneath the text being translated.
Please specify the language it is being translated to.

LANGUAGE: <Language being translated to>
TRANSLATOR: <Person to be credited>

-----------------------------------------------------------------------`

let buildString = all.map(t => `"${t}"`).join('\n\n') + '\n\n';

console.log(buildString);
fs.writeFile('postybirb_translation_guide.txt', header + '\n\n' + buildString, 'utf8', () => { console.log('done') });
