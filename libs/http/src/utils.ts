/**
 * Request-building and challenge-detection helpers without Electron runtime
 * imports or the proxy setup performed by the main HTTP entry point.
 */
export {
    isCloudflareChallengePage,
    isCloudflareChallengeResponse
} from './lib/cloudflare-challenge';
export { trackHttpDependency } from './lib/http-telemetry';
export { createRequestBody } from './lib/request-body';
export { getRequestUrl } from './lib/request-utils';
export type { HttpRequestBody } from './lib/types';

