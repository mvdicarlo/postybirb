import { Logger } from '@postybirb/logger';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { isObject } from 'lodash';
import forge from 'node-forge';
import { join } from 'path';

/**
 * Generates and caches a self-signed SSL certificate used for the local
 * HTTPS server. The certificate is persisted under `<userDataPath>/auth`.
 *
 * `userDataPath` is supplied by the caller so SSL has no direct dependency
 * on Electron (or any other runtime-specific path resolution).
 */
export class SSL {
  private static cachedCerts?: { key: string; cert: string };

  static async getOrCreateSSL(
    userDataPath: string,
  ): Promise<{ key: string; cert: string }> {
    // Return cached certs if available
    if (this.cachedCerts) {
      return this.cachedCerts;
    }

    const logger = Logger().withContext({ name: 'SSL' });
    const path = join(userDataPath, 'auth');
    const keyPath = join(path, 'key.pem');
    const certPath = join(path, 'cert.pem');

    // Check if certificates already exist
    let exists = false;
    try {
      await stat(certPath);
      exists = true;
    } catch {
      try {
        await mkdir(path, { recursive: true });
      } catch (err) {
        if (isObject(err) && 'code' in err && err.code !== 'EEXIST') {
          logger.error(err);
        }
      }
    }

    if (exists) {
      const certs = {
        key: (await readFile(keyPath)).toString(),
        cert: (await readFile(certPath)).toString(),
      };
      this.cachedCerts = certs;
      return certs;
    }

    logger.trace('Creating SSL certs...');
    const { pki } = forge;

    // Generate RSA key pair - will use native crypto if available
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 99,
    );

    const attrs = [
      { name: 'commonName', value: 'postybirb.com' },
      { name: 'countryName', value: 'US' },
      { shortName: 'ST', value: 'Virginia' },
      { name: 'localityName', value: 'Arlington' },
      { name: 'organizationName', value: 'PostyBirb' },
      { shortName: 'OU', value: 'PostyBirb' },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey);

    const pkey = pki.privateKeyToPem(keys.privateKey);
    const pcert = pki.certificateToPem(cert);

    await Promise.all([writeFile(keyPath, pkey), writeFile(certPath, pcert)]);

    logger.info('SSL Certs created');

    const certs = { cert: pcert, key: pkey };
    this.cachedCerts = certs;
    return certs;
  }
}
