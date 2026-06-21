import {
  encodePacScriptAsDataUrl,
  isPacDataUrl,
} from './pac-script-materializer';

describe('pac-script-materializer', () => {
  it('encodes PAC scripts as Chromium data URLs', () => {
    const script = 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    const dataUrl = encodePacScriptAsDataUrl(script);

    expect(dataUrl.startsWith('data:application/x-ns-proxy-autoconfig;base64,')).toBe(
      true,
    );
    expect(isPacDataUrl(dataUrl)).toBe(true);
    expect(
      Buffer.from(dataUrl.split(',')[1] ?? '', 'base64').toString('utf8'),
    ).toBe(script);
  });
});
