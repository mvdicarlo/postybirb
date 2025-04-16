import fs from 'fs';
import hbs from 'hbs';
import path from 'path';
import url from 'url';

/**
 * @param {import('./parse-add-website-input.js').AddWebsiteContext} data
 * @param {string} templateFileName
 * @param {string} folder
 * @param {string} fileName
 */
export function createFromTemplate(data, templateFileName, folder, fileName) {
  const dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const templatePath = path.join(dirname, 'templates', templateFileName);
  const template = hbs.handlebars.compile(
    fs.readFileSync(templatePath, 'utf8'),
  );

  const filePath = path.join(folder, fileName);
  console.log('Creating file:', filePath);

  const content = template(data);
  if (fs.existsSync(filePath)) {
    console.error('File already exists:', filePath);
    return fileName;
  }

  fs.writeFileSync(filePath, content);
  console.log('File created:', filePath);
  return fileName;
}
