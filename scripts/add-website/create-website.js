const path = require('path');
const fs = require('fs');
const createWebsiteFile = require('./create-website-file');
const createAccountDataFile = require('./create-account-data-file');
const createFileSubmissionFile = require('./create-file-submission-file');
const createMessageSubmissionFile = require('./create-message-submission-file');

function createWebsite(data, baseAppPath) {
  let { website, pascalWebsiteName, hasFile, hasMessage } = data;
  const websiteFolder = path.join(baseAppPath, website);
  const websiteModelsFolder = path.join(baseAppPath, website, 'models');

  try {
    fs.mkdirSync(websiteFolder, { recursive: true });
    fs.mkdirSync(websiteModelsFolder, { recursive: true });
    const websiteFileName = createWebsiteFile(data, websiteFolder);
    createAccountDataFile(data, websiteModelsFolder);

    if (hasMessage) {
      createMessageSubmissionFile(data, websiteModelsFolder);
    }
    if (hasFile) {
      createFileSubmissionFile(data, websiteModelsFolder);
    }
    console.log('File(s) created successfully!');
    const indexFilePath = path.join(baseAppPath, 'index.ts');
    let indexFileContent = fs.readFileSync(indexFilePath, 'utf8').trim();
    indexFileContent += `\nexport { default as ${pascalWebsiteName} } from './${website}/${websiteFileName.replace('.ts', '')}';`;
    fs.writeFileSync(indexFilePath, indexFileContent);
    console.log('Index file updated successfully!');
  } catch (err) {
    console.error('Error creating file(s):', err);
    // Rollback: delete created files and directories
    fs.rmdirSync(websiteModelsFolder, { force: true, recursive: true });
    fs.rmdirSync(websiteFolder, { force: true, recursive: true });
  }
}

module.exports = createWebsite;
