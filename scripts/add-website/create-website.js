import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createFromTemplate } from './create-file-from-template';

/**
 * @param {import('./parse-add-website-input.js').AddWebsiteContext} data
 * @param {string} baseAppPath
 */
export function createWebsite(data, baseAppPath) {
  let { website, pascalWebsiteName, hasFile, hasMessage } = data;
  const websiteFolder = join(baseAppPath, website);
  const websiteModelsFolder = join(baseAppPath, website, 'models');

  try {
    mkdirSync(websiteFolder, { recursive: true });
    mkdirSync(websiteModelsFolder, { recursive: true });
    const websiteFileName = createFromTemplate(
      data,
      'website.hbs',
      websiteFolder,
      'website.ts',
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

    const indexFilePath = join(baseAppPath, 'index.ts');
    let indexFileContent = readFileSync(indexFilePath, 'utf8').trim();
    indexFileContent += `\nexport { default as ${pascalWebsiteName} } from './${website}/${websiteFileName.replace('.ts', '')}';`;
    writeFileSync(indexFilePath, indexFileContent);

    console.log('Index file updated successfully!');
  } catch (err) {
    console.error('Error creating file(s):', err);
    // Rollback: delete created files and directories
    rmSync(websiteModelsFolder, { force: true, recursive: true });
    rmSync(websiteFolder, { force: true, recursive: true });
  }
}
