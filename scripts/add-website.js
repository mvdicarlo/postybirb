const inquirer = require('inquirer').default;
const path = require('path');
const createWebsite = require('./add-website/create-website');
const parseAddWebsiteInput = require('./add-website/parse-add-website-input');

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
      validate: (input) => {
        if (!input) return true;
        try {
          new URL(input);
          return true;
        } catch (error) {
          return 'Invalid URL format. Please enter a valid URL.';
        }
      },
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
    {
      type: 'checkbox',
      name: 'fileFeatures',
      when: (answers) => answers.submissionTypes.includes('file'),
      message: 'Select the features for the website:',
      choices: [
        {
          name: 'Image Submissions (allows users to post images to the website)',
          value: 'image',
        },
        {
          name: 'Video Submissions (allows users to post videos to the website)',
          value: 'video',
        },
        {
          name: 'Audio Submissions (allows users to post audio files to the website)',
          value: 'audio',
        },
      ],
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to create the website?',
    },
  ])
  .then((answers) => {
    if (answers.confirm) {
      createWebsite(parseAddWebsiteInput(answers), baseAppPath);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
  });
