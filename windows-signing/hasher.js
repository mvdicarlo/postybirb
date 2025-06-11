const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { parse, stringify } = require('yaml');
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 --path <filepath>')
  .demandOption(['path']).argv;

const filePath = path.normalize(argv.path);
console.log(`\x1b[32m[INFO]\x1b[0m Processing file at path: \x1b[33m${filePath}\x1b[0m`);

const yamlPath = path.join(filePath, `latest.yml`);
console.log(`\x1b[32m[INFO]\x1b[0m Reading YAML file from: \x1b[33m${yamlPath}\x1b[0m`);
const yaml = parse(fs.readFileSync(yamlPath, 'utf8'));
const version = yaml.version;
const existingHash = yaml.sha512;
console.log(
  `\x1b[32m[INFO]\x1b[0m\x1b[36m Version:\x1b[0m ${version}\x1b[36m Existing Hash:\x1b[0m ${existingHash}`,
);
const target = yaml.files[0].url;

function hashFile(file, algorithm = 'sha512', encoding = 'base64', options) {
  console.log(`\x1b[32m[INFO]\x1b[0m Hashing file: \x1b[33m${file}\x1b[0m`);
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    hash.on('error', reject).setEncoding(encoding);
    fs.createReadStream(
      file,
      Object.assign({}, options, {
        highWaterMark: 1024 * 1024,
        /* better to use more memory but hash faster */
      }),
    )
      .on('error', reject)
      .on('open', () =>
        console.log(`\x1b[32m[INFO]\x1b[0m Started reading file: \x1b[33m${file}\x1b[0m`),
      )
      .on('end', () => {
        console.log(`\x1b[32m[INFO]\x1b[0m Finished reading file: \x1b[33m${file}\x1b[0m`);
        hash.end();
        resolve(hash.read());
      })
      .pipe(hash, {
        end: false,
      });
  });
}

hashFile(path.join(filePath, target))
  .then(hash => {
    console.log(`\x1b[32m[INFO]\x1b[0m Computed hash: \x1b[33m${hash}\x1b[0m`);
    if (existingHash === hash) {
      throw new Error('Hashes are the same');
    }
    console.log(`\x1b[32m[INFO]\x1b[0m Updating YAML with new hash...\n`);
    yaml.sha512 = hash;
    yaml.files[0].sha512 = hash;
    console.log(`\x1b[32m[INFO]\x1b[0m New YAML content:\n${stringify(yaml)}`);
    fs.writeFileSync(yamlPath, stringify(yaml));
    console.log(`\x1b[32m[INFO]\x1b[0m YAML file updated successfully.`);
  })
  .catch(err => {
    console.error('\x1b[31m[ERROR]\x1b[0m', err);
    throw err;
  });
