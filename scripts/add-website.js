const inquirer = require('inquirer').default;
const path = require('path');
const fs = require('fs');

const isDashCasedOrLowercase = (str) =>
  /^[a-z]+(-[a-z]+)*$/.test(str) || /^[a-z]+$/.test(str);

const currentPath = path.resolve();
const baseAppPath = currentPath.includes('postybirb')
  ? path.resolve(
      'apps',
      'client-server',
      'src',
      'app',
      'websites',
      'implementations',
    )
  : path.resolve(
      '..',
      'apps',
      'client-server',
      'src',
      'app',
      'websites',
      'implementations',
    );

function createWebsiteFile(websiteName) {
  const websiteFileName = `${websiteName}.website.ts`;
  const websiteFolder = path.join(baseAppPath, websiteName);
  const websiteFilePath = path.join(websiteFolder, websiteFileName);

  console.log('Creating file:', websiteFilePath);

  const websiteNameAsPascalCase = websiteName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const content = `
import { ILoginState } from '@postybirb/types';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { Website } from '../../website';

export type ${websiteNameAsPascalCase}AccountData = {};

@WebsiteMetadata({
  name: '${websiteName}',
  displayName: '${websiteName}',
})
export default class ${websiteNameAsPascalCase} extends Website<${websiteNameAsPascalCase}AccountData> {
  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<${websiteNameAsPascalCase}AccountData> =
    {};

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    return this.loginState.setLogin(true, 'TestUser');
  }
}
`;

  fs.mkdirSync(websiteFolder, { recursive: true });
  if (fs.existsSync(websiteFilePath)) {
    console.error('File already exists:', websiteFilePath);
    return;
  }
  fs.writeFileSync(websiteFilePath, content);
  console.log('File created successfully!');

  const indexFilePath = path.join(baseAppPath, 'index.ts');
  let indexFileContent = fs.readFileSync(indexFilePath, 'utf8');
  indexFileContent += `\nexport { default as ${websiteNameAsPascalCase} } from './${websiteName}/${websiteFileName.replace('.ts', '')}';`;
  fs.writeFileSync(indexFilePath, indexFileContent);
  console.log('Index file updated successfully!');
}

inquirer
  .prompt([
    {
      type: 'input',
      name: 'websiteName',
      message: 'Enter the website name (dash-cased or all lowercase one word):',
      validate: (input) =>
        isDashCasedOrLowercase(input) ||
        'Invalid website name. It must be in dash-case or all lowercase one word.',
    },
  ])
  .then((answers) => {
    createWebsiteFile(answers.websiteName.trim());
  })
  .catch((error) => {
    console.error('Error:', error);
  });
