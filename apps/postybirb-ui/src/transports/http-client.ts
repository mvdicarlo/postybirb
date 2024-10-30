/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line no-restricted-globals
export const defaultTargetProvider = () =>
  `https://localhost:${window.electron.app_port}`;

type FetchMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
};

export class HttpClient {
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

  private async performRequest<T = any>(
    method: FetchMethod,
    path: string,
    bodyOrSearchParams: RequestBody | SearchBody,
    options: HttpOptions,
  ): Promise<HttpResponse<T>> {
    const shouldUseBody = this.supportsBody(method);
    const url = this.createPath(
      path,
      shouldUseBody ? undefined : (bodyOrSearchParams as SearchBody),
    );

    let headers: Record<string, string> = {
      'Content-Type':
        bodyOrSearchParams instanceof FormData
          ? 'multipart/form-data'
          : 'application/json',
    };

    if (bodyOrSearchParams instanceof FormData || !shouldUseBody) {
      // eslint-disable-next-line lingui/no-unlocalized-strings
      delete headers['Content-Type'];
    }

    if (options.headers) {
      headers = { ...options.headers, ...headers };
    }

    const res = await fetch(url, {
      method,
      body: shouldUseBody
        ? this.handleRequestData(bodyOrSearchParams as RequestBody)
        : undefined,
      headers,
    });

    const resObj: HttpResponse<T> = {
      body: await this.processResponse<T>(res),
      status: res.status,
      statusText: res.statusText,
      error: { error: '', statusCode: 0, message: '' },
    };

    if (!res.ok) {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ ...resObj, error: resObj.body });
    }

    return resObj;
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
    // eslint-disable-next-line lingui/no-unlocalized-strings
    if (res.headers.get('Content-Type')?.includes('application/json')) {
      return this.processJson<T>(res);
    }

    return this.processText(res);
  }

  private async processJson<T>(res: Response): Promise<T> {
    return (await res.json()) as T;
  }

  private async processText<T>(res: Response): Promise<T> {
    return (await res.body?.getReader().read()) as T;
  }
}
