# http

Electron-backed HTTP requests with cookie partitions, Cloudflare fallback, and
dependency tracking.

## Structure

- `Http` remains the public facade for `get`, `post`, `patch`, `put`,
  `getWebsiteCookies`, and `getUserAgent`.
- [request-body.ts](./src/lib/request-body.ts) encodes JSON, URL-encoded, multipart, and binary request
  bodies. The same encoded body is reused when falling back to a browser request.
- [request-utils.ts](./src/lib/request-utils.ts) provides URL construction and shared timeout handling.
- [client-request.ts](./src/lib/client-request.ts) handles Electron `net.request`, request headers, response
  decoding, redirects, and request cleanup.
- [browser-request.ts](./src/lib/browser-request.ts) handles hidden browser requests, raw uploads, response
  extraction, and window cleanup.
- [cloudflare-challenge.ts](./src/lib/cloudflare-challenge.ts) detects challenges and handles invisible/interactive
  resolution.
- [http-telemetry.ts](./src/lib/http-telemetry.ts) reports dependencies and errors without interrupting HTTP
  requests if telemetry fails.

The main `@postybirb/http` entry point exports these components for reuse and
continues to initialize the Electron proxy integration before loading them.

## Electron-free helpers

Use `@postybirb/http/utils` for body encoding, URL construction, and challenge
detection without loading Electron or initializing the proxy integration:

```ts
import { createRequestBody, getRequestUrl } from '@postybirb/http/utils';

const url = getRequestUrl('https://example.com/api', {
  queryParameters: { page: 1 },
});
const body = createRequestBody({ type: 'json', data: { title: 'Example' } });
```

Query parameters replace any existing query string, matching the behavior of
`Http`. Continue to use `@postybirb/http/types` for the existing Electron-free
types and `FormFile` entry point.

## Running unit tests

Run `nx test http` to execute the unit tests via [Jest](https://jestjs.io).
