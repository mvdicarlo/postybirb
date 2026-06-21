import type { Certificate, Session } from 'electron';

export function isPostyBirbLocalCertificate(certificate: Certificate): boolean {
  return (
    certificate.issuerName === 'postybirb.com' &&
    certificate.subject.organizations[0] === 'PostyBirb' &&
    certificate.issuer.country === 'US'
  );
}

/**
 * Allows Chromium (including PAC script downloads) to trust the local Nest
 * HTTPS server certificate on the given session.
 */
export function trustPostyBirbLocalCertificate(targetSession: Session): void {
  if (typeof targetSession.setCertificateVerifyProc !== 'function') {
    return;
  }

  targetSession.setCertificateVerifyProc((request, callback) => {
    if (request.errorCode === 0) {
      callback(0);
      return;
    }

    if (isPostyBirbLocalCertificate(request.certificate)) {
      callback(0);
      return;
    }

    callback(-2);
  });
}
