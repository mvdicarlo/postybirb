import fs from 'fs';
import path from 'path';
import { createFromTemplate } from './create-file-from-template.js';

/**
 * @param {import('./parse-add-website-input.js').AddWebsiteContext} data
 * @param {string} baseAppPath
 */
export function createWebsite(data, baseAppPath) {
  let { website, pascalWebsiteName, hasFile, hasMessage } = data;
  const websiteFolder = path.join(baseAppPath, website);
  const websiteModelsFolder = path.join(baseAppPath, website, 'models');

  try {
    fs.mkdirSync(websiteFolder, { recursive: true });
    fs.mkdirSync(websiteModelsFolder, { recursive: true });
    const websiteFileName = createFromTemplate(
      data,
      'website.hbs',
      websiteFolder,
      `${website}.website.ts`,
    );

    createFromTemplate(
      data,
      'account-data.hbs',
      websiteModelsFolder,
      `${website}-account-data.ts`,
    );

    if (hasMessage) {
      createFromTemplate(
        data,
        'message-submission.hbs',
        websiteModelsFolder,
        `${website}-message-submission.ts`,
      );
    }
    if (hasFile) {
      createFromTemplate(
        data,
        'file-submission.hbs',
        websiteModelsFolder,
        `${website}-file-submission.ts`,
      );
    }

    console.log('File(s) created successfully!');

    const indexFilePath = path.join(baseAppPath, 'index.ts');
    let indexFileContent = fs.readFileSync(indexFilePath, 'utf8').trim();
    indexFileContent += `\r\nexport { default as ${pascalWebsiteName} } from './${website}/${websiteFileName.replace('.ts', '')}';\r\n`;
    fs.writeFileSync(indexFilePath, indexFileContent);

    console.log('Index file updated successfully!');
  } catch (err) {
    console.error('Error creating file(s):', err);
    // Rollback: delete created files and directories
    fs.rmSync(websiteModelsFolder, { force: true, recursive: true });
    fs.rmSync(websiteFolder, { force: true, recursive: true });
  }
}
