import type { Certificate, Session } from 'electron';
import {
  isPostyBirbLocalCertificate,
  trustPostyBirbLocalCertificate,
} from './local-certificate-trust';

function createCertificate(
  overrides: Partial<Certificate> = {},
): Certificate {
  return {
    data: '',
    issuer: {
      commonName: 'postybirb.com',
      organizations: ['PostyBirb'],
      organizationUnits: [],
      country: 'US',
    },
    issuerName: 'postybirb.com',
    issuerCert: {} as Certificate,
    subject: {
      commonName: 'localhost',
      organizations: ['PostyBirb'],
      organizationUnits: [],
      country: 'US',
    },
    subjectName: 'localhost',
    serialNumber: '1',
    validStart: 0,
    validExpiry: 0,
    fingerprint: 'fp',
    ...overrides,
  } as Certificate;
}

describe('local-certificate-trust', () => {
  it('detects the PostyBirb local certificate', () => {
    expect(isPostyBirbLocalCertificate(createCertificate())).toBe(true);
    expect(
      isPostyBirbLocalCertificate(
        createCertificate({ issuerName: 'other.example' }),
      ),
    ).toBe(false);
  });

  it('trusts the PostyBirb local certificate on a session', () => {
    let verifyCallback:
      | ((request: { errorCode: number; certificate: Certificate }, callback: (result: number) => void) => void)
      | undefined;

    const targetSession = {
      setCertificateVerifyProc: jest.fn((callback) => {
        verifyCallback = callback;
      }),
    } as unknown as Session;

    trustPostyBirbLocalCertificate(targetSession);

    expect(targetSession.setCertificateVerifyProc).toHaveBeenCalled();
    expect(verifyCallback).toBeDefined();

    const callback = jest.fn();
    verifyCallback?.(
      { errorCode: -201, certificate: createCertificate() },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(0);
  });
});
