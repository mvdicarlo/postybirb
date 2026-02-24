/* eslint-disable lingui/no-unlocalized-strings */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
// eslint-disable-next-line no-restricted-globals

export const REMOTE_PASSWORD_KEY = 'remote_password';
export const REMOTE_HOST_KEY = 'remote_host';
export const REMOTE_MODE_KEY = 'remote_mode';

export const defaultTargetPath = `https://localhost:${window.electron.app_port}`;

// ---------------------------------------------------------------------------
// Cached localStorage config
// Values are read once on module load and refreshed on `storage` events or
// explicit calls to `refreshRemoteConfig()`. This avoids synchronous
// `localStorage.getItem` calls on every HTTP request.
// ---------------------------------------------------------------------------
interface RemoteConfig {
  host: string | null;
  password: string | null;
  mode: 'client' | 'host' | null;
}

let cachedConfig: RemoteConfig = {
  host: localStorage.getItem(REMOTE_HOST_KEY),
  password: localStorage.getItem(REMOTE_PASSWORD_KEY),
  mode: localStorage.getItem(REMOTE_MODE_KEY) as 'client' | 'host' | null,
};

export const getRemoteConfig = (): RemoteConfig => cachedConfig;

/**
 * Re-read remote host / password from localStorage.
 * Call this after programmatically writing to localStorage so the cached
 * values stay in sync (the `storage` event only fires for *other* tabs).
 */
export const refreshRemoteConfig = () => {
  cachedConfig = {
    host: localStorage.getItem(REMOTE_HOST_KEY),
    password: localStorage.getItem(REMOTE_PASSWORD_KEY),
    mode: localStorage.getItem(REMOTE_MODE_KEY) as 'client' | 'host' | null,
  };
};

// Keep the cache in sync when another tab/window changes the values.
window.addEventListener('storage', (e) => {
  if (e.key === REMOTE_HOST_KEY || e.key === REMOTE_PASSWORD_KEY) {
    refreshRemoteConfig();
  }
});

export const defaultTargetProvider = () => {
  const remoteUrl = cachedConfig.host;
  if (remoteUrl?.trim()) {
    return `https://${remoteUrl}`;
  }

  return defaultTargetPath;
};

export const getRemotePassword = () => {
  const remotePassword = cachedConfig.password;
  const electronRemotePassword = window.electron?.getRemoteConfig()?.password;
  return remotePassword?.trim() || electronRemotePassword?.trim();
};

type FetchMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Error thrown when a network-level failure occurs (no response received)
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when an HTTP request returns a non-2xx status code
 */
export class HttpError<T = unknown> extends Error {
  public readonly response: HttpResponse<T>;
  public readonly statusCode: number;

  constructor(response: HttpResponse<T>) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = 'HttpError';
    this.response = {
      ...response,
      error: response.body as unknown as ErrorResponse,
    };
    this.statusCode = response.status;
  }
}

export type ErrorResponse<T = string> = {
  error: string;
  message: T;
  statusCode: number;
};
export type HttpResponse<T> = {
  body: T;
  status: number;
  statusText: string;
  error: ErrorResponse;
};

// eslint-disable-next-line @typescript-eslint/ban-types
type RequestBody = Object | BodyInit | undefined;
type SearchBody = string | object | undefined;
type HttpOptions = {
  headers?: Record<string, string>;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  /** Base delay in ms between retries, uses exponential backoff (default: 1000) */
  retryDelay?: number;
};

export class HttpClient {
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000;

  constructor(
    private readonly basePath: string,
    private readonly targetProvider: () => string = defaultTargetProvider,
  ) {}

  public get<T = any>(
    path = '',
    searchParams: SearchBody = undefined,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.performRequest<T>('GET', path, searchParams, options ?? {});
  }

  public post<T = any>(
    path = '',
    body: RequestBody = undefined,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.performRequest<T>('POST', path, body, options ?? {});
  }

  public put<T = any>(
    path = '',
    searchParams: SearchBody = undefined,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.performRequest<T>('PUT', path, searchParams, options ?? {});
  }

  public patch<T = any>(
    path = '',
    body: RequestBody = undefined,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.performRequest<T>('PATCH', path, body, options ?? {});
  }

  public delete<T = any>(
    path = '',
    searchParams: SearchBody = undefined,
    options: HttpOptions = {},
  ): Promise<HttpResponse<T>> {
    return this.performRequest<T>('DELETE', path, searchParams, options ?? {});
  }

  /**
   * Determines if a request should be retried based on status code
   */
  private shouldRetry(status: number): boolean {
    // Retry on server errors (5xx) and certain client errors
    // Don't retry on 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found)
    // as these are unlikely to succeed on retry
    if (status >= 500) return true;
    // Retry on 408 (timeout), 429 (too many requests)
    if (status === 408 || status === 429) return true;
    return false;
  }

  /**
   * Waits for exponential backoff delay
   */
  private async delay(attempt: number, baseDelay: number): Promise<void> {
    const delayMs = baseDelay * 2 ** attempt;
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private async performRequest<T = any>(
    method: FetchMethod,
    path: string,
    bodyOrSearchParams: RequestBody | SearchBody,
    options: HttpOptions,
  ): Promise<HttpResponse<T>> {
    const maxRetries = options.retries ?? HttpClient.DEFAULT_RETRIES;
    const retryDelay = options.retryDelay ?? HttpClient.DEFAULT_RETRY_DELAY;

    const shouldUseBody = this.supportsBody(method);
    const url = this.createPath(
      path,
      shouldUseBody ? undefined : (bodyOrSearchParams as SearchBody),
    );

    // Build headers - let browser set Content-Type for FormData
    const isFormData = bodyOrSearchParams instanceof FormData;
    let headers: Record<string, string> = {};

    // Only set Content-Type for non-FormData requests
    if (!isFormData && shouldUseBody) {
      headers['Content-Type'] = 'application/json';
    }

    // Add remote password if configured
    const pw = getRemotePassword();
    if (pw) {
      headers['X-Remote-Password'] = pw;
    }

    // Merge custom headers (custom headers take precedence)
    if (options.headers) {
      headers = { ...headers, ...options.headers };
    }

    const fetchOptions: RequestInit = {
      method,
      body: shouldUseBody
        ? this.handleRequestData(bodyOrSearchParams as RequestBody)
        : undefined,
      headers,
    };

    let lastError: Error | undefined;
    let lastResponse: HttpResponse<T> | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, fetchOptions);
        const resObj = await this.buildResponse<T>(res);

        if (!res.ok) {
          // Check if we should retry this error
          if (this.shouldRetry(res.status) && attempt < maxRetries) {
            lastResponse = resObj;
            await this.delay(attempt, retryDelay);
            continue;
          }
          // Non-retryable error, throw with response details
          throw new HttpError(resObj);
        }

        return resObj;
      } catch (error) {
        // Handle network-level errors (no response received)
        if (
          error instanceof TypeError ||
          (error as Error)?.name === 'TypeError'
        ) {
          lastError = error as Error;
          if (attempt < maxRetries) {
            await this.delay(attempt, retryDelay);
            continue;
          }
          throw new NetworkError(
            `Network request failed after ${maxRetries + 1} attempts: ${(error as Error).message}`,
            error as Error,
          );
        }
        // Re-throw HTTP errors (already have response)
        throw error;
      }
    }

    // Should not reach here, but handle edge case
    if (lastResponse) {
      throw new HttpError(lastResponse);
    }
    throw lastError ?? new Error('Request failed');
  }

  /**
   * Builds HttpResponse object from fetch Response, handling parse errors
   */
  private async buildResponse<T>(res: Response): Promise<HttpResponse<T>> {
    let body: T;
    try {
      body = await this.processResponse<T>(res);
    } catch (parseError) {
      // If we can't parse the response, use empty object or error message
      body = (
        res.ok
          ? {}
          : { error: 'Parse error', message: 'Failed to parse response body' }
      ) as T;
    }

    return {
      body,
      status: res.status,
      statusText: res.statusText,
      error: { error: '', statusCode: 0, message: '' },
    };
  }

  private createPath(path: string, searchBody: SearchBody): URL {
    const url = new URL(`api/${this.basePath}/${path}`, this.targetProvider());
    if (typeof searchBody === 'string') {
      url.search = searchBody;
    } else if (searchBody && typeof searchBody === 'object') {
      Object.entries(searchBody).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            url.searchParams.append(
              key,
              typeof v === 'string' ? v : JSON.stringify(v),
            );
          });
        } else if (typeof value === 'object') {
          url.searchParams.append(key, JSON.stringify(value));
        } else {
          url.searchParams.append(key, value as string);
        }
      });
    }

    return url;
  }

  private handleRequestData(body: RequestBody): BodyInit | undefined {
    if (body instanceof FormData) {
      return body;
    }

    if (typeof body === 'object') {
      return JSON.stringify(body);
    }

    if (typeof body === 'string') {
      return body;
    }

    return body;
  }

  private supportsBody(method: FetchMethod): boolean {
    switch (method) {
      case 'POST':
      case 'PATCH':
        return true;
      case 'PUT':
      case 'GET':
      case 'DELETE':
      default:
        return false;
    }
  }

  private async processResponse<T>(res: Response): Promise<T> {
    if (res.headers.get('Content-Type')?.includes('application/json')) {
      return this.processJson<T>(res);
    }

    return this.processText(res);
  }

  private async processJson<T>(res: Response): Promise<T> {
    return (await res.json()) as T;
  }

  private async processText<T>(res: Response): Promise<T> {
    return (await res.text()) as unknown as T;
  }
}
