const fs = require('fs');
const hbs = require('hbs');
const path = require('path');

const template = hbs.compile(
  fs.readFileSync(
    path.join(__dirname, 'templates/message-submission.hbs'),
    'utf8',
  ),
);

function create(data, folder) {
  const { website } = data;
  const fileName = `${website}-message-submission.ts`;
  const filePath = path.join(folder, fileName);
  console.log('Creating file:', filePath);
  const content = template(data);
  if (fs.existsSync(filePath)) {
    console.error('File already exists:', filePath);
    return;
  }
  fs.writeFileSync(filePath, content);
  console.log('File created:', filePath);
  return fileName;
}

module.exports = create;
