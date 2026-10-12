import {
  anonymizeDependencyTarget,
  filterTelemetryProperties,
  sanitizeError,
  stripLocalPaths,
} from './telemetry-privacy';

describe('telemetry privacy', () => {
  it.each([
    [
      "ENOENT: open 'C:\\Users\\Alice Smith\\Pictures\\Private art.png'",
      "ENOENT: open '[local-path]'",
    ],
    [
      'Failed to load C:\\Users\\alice\\AppData\\Local\\PostyBirb\\settings.json',
      'Failed to load [local-path]',
    ],
    [
      "EACCES: open '/home/alice/My Pictures/private.png'",
      "EACCES: open '[local-path]'",
    ],
    [
      'Failed to read /Users/alice/Documents/settings.json',
      'Failed to read [local-path]',
    ],
    [
      "Cannot open '\\\\alice-pc\\Private Share\\art.png'",
      "Cannot open '[local-path]'",
    ],
    [
      'File file:///C:/Users/alice/private.png is missing',
      'File [local-path] is missing',
    ],
    [
      "ENOENT: open '/custom-installation/My Pictures/private.png'",
      "ENOENT: open '[local-path]'",
    ],
  ])('strips local paths from %s', (message, expected) => {
    expect(stripLocalPaths(message)).toBe(expected);
  });

  it('preserves free-form error messages, including URLs and credentials', () => {
    const message =
      'Upload failed for alice@example.com: https://api.example.com/private?token=secret (HTTP 403)';
    expect(stripLocalPaths(message)).toBe(message);
    expect(sanitizeError(new Error(message)).message).toBe(message);
    expect(stripLocalPaths("HTTP 404 for '/api/users/alice'")).toBe(
      "HTTP 404 for '/api/users/alice'",
    );
  });

  it('preserves code locations without installation paths or renderer origins', () => {
    const error = new TypeError('Upload failed');
    error.stack = [
      'TypeError: Upload failed',
      '    at upload (C:\\Users\\Alice Smith\\AppData\\Local\\PostyBirb\\app.asar\\dist\\main.js:12:3)',
      '    at login (/home/alice/PostyBirb/app.asar/main.js:20:8)',
      '    at render (http://127.0.0.1:4200/assets/index.js?account=alice:30:9)',
      '    at load (file:///C:/Users/alice/app.asar/renderer.js:40:2)',
      '    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
    ].join('\n');

    const sanitized = sanitizeError(error);

    expect(sanitized).not.toBe(error);
    expect(sanitized.name).toBe('TypeError');
    expect(sanitized.stack).toBe(
      [
        'TypeError: Upload failed',
        '    at upload (main.js:12:3)',
        '    at login (main.js:20:8)',
        '    at render (index.js:30:9)',
        '    at load (renderer.js:40:2)',
        '    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
      ].join('\n'),
    );
    expect(error.stack).toContain('Alice Smith');
  });

  it('strips Firefox and Safari stack frame origins without losing code locations', () => {
    const error = new Error('Rendering failed');
    error.stack =
      'render@https://private.example.com/assets/index.js?token=secret:10:2';
    expect(sanitizeError(error).stack).toBe('render@index.js:10:2');
  });

  it('drops unknown properties rather than trying to redact arbitrary metadata', () => {
    expect(
      filterTelemetryProperties({
        source: 'posting',
        website: 'bluesky',
        submissionType: 'FILE',
        stage: 'submission',
        accountId: 'private-account',
        submissionId: 'private-submission',
        userId: 'private-user',
        sessionId: 'private-session',
        options: { title: 'Private title', description: 'Private description' },
        requestHeaders: { Authorization: 'secret' },
        responseBody: 'private-response',
        errorMessage: 'should use the exception message instead',
        telemetrySchemaVersion: 'old',
        component: { nested: 'private' },
      }),
    ).toEqual({
      telemetrySchemaVersion: '2',
      source: 'posting',
      website: 'bluesky',
      submissionType: 'FILE',
      stage: 'submission',
    });
  });

  it('keeps only the public hostname of a dependency', () => {
    expect(
      anonymizeDependencyTarget(
        'https://alice:secret@api.example.com:8443/users/alice?token=secret#private',
      ),
    ).toBe('api.example.com');
  });

  it.each([
    'http://localhost:3000/private',
    'http://alice-pc/private',
    'http://alice.local/private',
    'http://alice.internal/private',
    'http://127.0.0.1/private',
    'http://10.0.0.1/private',
    'http://[::1]/private',
  ])('anonymizes local and IP address dependency targets: %s', (url) => {
    expect(anonymizeDependencyTarget(url)).toBe('private-host');
  });

  it('surfaces an invalid dependency URL', () => {
    expect(() => anonymizeDependencyTarget('not a URL')).toThrow('Invalid URL');
  });
});
