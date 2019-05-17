const Cryptr = require('cryptr');

exports.encryptProfile = function encryptProfile(_data) {
  if (!_data) return {};
  const data = JSON.parse(JSON.stringify(_data));
  const profiles = data.profiles || [];
  profiles.forEach((p) => {
    p.data = encrypt(p.data, p.id);
  });

  return JSON.stringify(data);
};

exports.decryptProfile = function decryptProfile(data) {
  if (!data) return {};
  const json = JSON.parse(data);
  const profiles = json.profiles || [];
  profiles.forEach((p) => {
    p.data = decrypt(p.data, p.id);
  });

  return json;
};

function encrypt(data, key) {
  const cryptr = new Cryptr(key);
  return cryptr.encrypt(JSON.stringify(data));
}

function decrypt(text, key) {
  const cryptr = new Cryptr(key);
  try {
    return JSON.parse(cryptr.decrypt(text));
  } catch (err) {
    return {};
  }
}
