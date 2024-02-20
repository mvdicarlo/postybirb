import { Logger } from '@postybirb/logger';
import { app } from 'electron';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import forge from 'node-forge';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(forge as any).options.usePureJavaScript = true;

export class SSL {
  static async getOrCreateSSL(): Promise<{ key: string; cert: string }> {
    const logger = Logger().withContext({ name: 'SSL' });
    const path = join(app.getPath('userData'), 'auth');
    const keyPath = join(path, 'key.pem');
    const certPath = join(path, 'cert.pem');

    let exists = false;
    try {
      await stat(certPath);
      exists = true;
    } catch {
      try {
        await mkdir(path);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          logger.error(err);
        }
      }
    }

    if (exists) {
      return {
        key: (await readFile(keyPath)).toString(),
        cert: (await readFile(certPath)).toString(),
      };
    }

    logger.trace('Creating SSL certs...');
    const { pki } = forge;

    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 99
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
    return { cert: pcert, key: pkey };
  }
}
