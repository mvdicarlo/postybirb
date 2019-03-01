const crypto = require('crypto');

exports.encryptProfile = function encryptProfile(data) {
    if (!data) return '{}';
    const profiles = data.profiles || [];
    profiles.forEach((p) => {
        p.data = encrypt(JSON.stringify(JSON.stringify(p.data)), p.id.substring(0, 16));
    });

    return JSON.stringify(data);
};

exports.decryptProfile = function decryptProfile(data) {
    if (!data) return {};
    const json = JSON.parse(data);
    const profiles = json.profiles || [];
    profiles.forEach((p) => {
        p.data = JSON.parse(decrypt(p.data, p.id.substring(0, 16)));
    });

    return json;
};

function encrypt(text, key) {
    const cipher = crypto.createCipheriv('aes128', key, key);

    let result = cipher.update(text || '{}', 'utf8', 'binary');
    result += cipher.final('binary');

    return result;
}

function decrypt(text, key) {
    const decipher = crypto.createDecipheriv('aes128', key, key);
    let result = null;

    try {
        result = decipher.update(text, 'binary', 'utf8');
        result += decipher.final('utf8');
    } catch (err) {
        return '{}';
    }

    return result;
}
