import { existsSync, readFileSync, writeFileSync } from 'fs';
import { handlebars } from 'hbs';
import { join } from 'path';

/**
 * @param {import('./parse-add-website-input.js').AddWebsiteContext} data 
 * @param {string} templateFileName
 * @param {string} folder 
 * @param {string} fileName 
 */
export function createFromTemplate(data, templateFileName, folder, fileName) {
  const template = handlebars.compile(
    readFileSync(join(__dirname, 'templates', templateFileName), 'utf8'),
  );

  const filePath = join(folder, fileName);
  console.log('Creating file:', filePath);

  const content = template(data);
  if (existsSync(filePath)) {
    console.error('File already exists:', filePath);
    return fileName
  }
  
  writeFileSync(filePath, content);
  console.log('File created:', filePath);
  return fileName;
}
