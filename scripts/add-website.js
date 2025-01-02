const inquirer = require('inquirer').default;
const path = require('path');
const fs = require('fs');
const hbs = require('hbs');

const websiteTemplate = hbs.compile(
  fs.readFileSync(path.join(__dirname, 'templates/website.hbs'), 'utf8'),
);
const accountDataTemplate = hbs.compile(
  fs.readFileSync(path.join(__dirname, 'templates/account-data.hbs'), 'utf8'),
);
const messageSubmissionTemplate = hbs.compile(
  fs.readFileSync(
    path.join(__dirname, 'templates/message-submission.hbs'),
    'utf8',
  ),
);
const fileSubmissionTemplate = hbs.compile(
  fs.readFileSync(
    path.join(__dirname, 'templates/file-submission.hbs'),
    'utf8',
  ),
);

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

function createNewWebsite(answers) {
  let { websiteName, submissionTypes, websiteUrl } = answers;
  websiteName = websiteName.toLowerCase().trim();
  const websiteFileName = `${websiteName}.website.ts`;
  const websiteFolder = path.join(baseAppPath, websiteName);
  const websiteModelsFolder = path.join(baseAppPath, websiteName, 'models');
  const websiteFilePath = path.join(websiteFolder, websiteFileName);

  console.log('Creating file:', websiteFilePath);

  const websiteNameAsPascalCase = websiteName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const data = {
    websiteName,
    websiteNameAsPascalCase,
    hasFile: submissionTypes.includes('file'),
    hasMessage: submissionTypes.includes('message'),
    websiteUrl,
  };
  const websiteFileContent = websiteTemplate(data);
  const accountFileContent = accountDataTemplate(data);
  const messageSubmissionFileContent = data.hasMessage
    ? messageSubmissionTemplate(data)
    : null;
  const fileSubmissionFileContent = data.hasFile
    ? fileSubmissionTemplate(data)
    : null;

  if (fs.existsSync(websiteFilePath)) {
    console.error('File already exists:', websiteFilePath);
    return;
  }

  fs.mkdirSync(websiteFolder, { recursive: true });
  fs.mkdirSync(websiteModelsFolder, { recursive: true });
  fs.writeFileSync(websiteFilePath, websiteFileContent);
  fs.writeFileSync(
    path.join(websiteModelsFolder, `${websiteName}-account-data.ts`),
    accountFileContent,
  );
  if (messageSubmissionFileContent) {
    const messageSubmissionFilePath = path.join(
      websiteModelsFolder,
      `${websiteName}-message-submission.ts`,
    );
    fs.writeFileSync(messageSubmissionFilePath, messageSubmissionFileContent);
  }
  if (fileSubmissionFileContent) {
    const fileSubmissionFilePath = path.join(
      websiteModelsFolder,
      `${websiteName}-file-submission.ts`,
    );
    fs.writeFileSync(fileSubmissionFilePath, fileSubmissionFileContent);
  }
  console.log('File(s) created successfully!');

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
    {
      type: 'input',
      name: 'websiteUrl',
      message: '(optional) Enter the website URL: (e.g. https://example.com)',
    },
    {
      type: 'checkbox',
      name: 'submissionTypes',
      message: 'Select the submission types for the website:',
      choices: [
        {
          name: 'File Submissions (allows users to post files to the website)',
          value: 'file',
        },
        {
          name: 'Message Submissions (allows users to post messages to the website (e.g. blog posts, tweets))',
          value: 'message',
        },
      ],
      validate: (input) =>
        input.length > 0 || 'You must select at least one submission type.',
    },
  ])
  .then((answers) => {
    createNewWebsite(answers);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
