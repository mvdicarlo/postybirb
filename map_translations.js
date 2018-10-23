const fs = require('fs');

const assetsDir = `${__dirname}/src/assets/i18n/`;
const other = ['ru.json'];


function loadEnglishFile() {
    const translationMap = {};
    const file = fs.readFileSync(`${assetsDir}en.json`);
    const json = JSON.parse(file);

    Object.keys(json).forEach((key) => {
        translationMap[json[key]] = key;
    });

    return translationMap;
}

function loadOtherFiles() {
    const file = fs.readFileSync(assetsDir + other[0]);
    return JSON.parse(file);
}

function map(reverseMap, translationMap) {
    const newMap = Object.assign({}, translationMap);
    Object.keys(reverseMap).forEach((key) => {
        if (newMap[key]) {
            newMap[reverseMap[key]] = newMap[key];
            delete newMap[key];
        }
    });

    return newMap;
}

const reverseMap = loadEnglishFile();

const mapped = map(reverseMap, loadOtherFiles());


fs.writeFile('mapped.json', JSON.stringify(mapped), 'utf8', () => { console.log('done'); });
