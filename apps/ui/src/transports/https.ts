import { Primitive } from 'type-fest';

export function getUrlSource(): string {
  return `https://localhost:${window.electron.app_port}`;
}

export type FetchResult<T> = {
  status: number;
  statusText: string;
  body: T;
  error?: any;
};

export default class Https {
  get url(): string {
    return `${getUrlSource()}/api/${this.apiDomain}`;
  }

  constructor(private readonly apiDomain: string) {}

  private createUrl(path?: string, search?: Record<string, Primitive>): string {
    const url = new URL(`${this.url}/${path ?? ''}`);
    if (search) {
      Object.entries(search).forEach(([key, value]) =>
        url.searchParams.append(key, JSON.stringify(value))
      );
    }

    return url.toString();
  }

  private async processResponse<T>(res: Response): Promise<FetchResult<T>> {
    if (res.status > 201) {
      const result: FetchResult<undefined> = {
        status: res.status,
        statusText: res.statusText,
        body: undefined,
        error: await res.json(),
      };

      return Promise.reject(result);
    }

    const result: FetchResult<T> = {
      status: res.status,
      statusText: res.statusText,
      body: (await res.json()) as T,
    };

    return result;
  }

  async delete(path?: string, search?: Record<string, Primitive>) {
    const res = await fetch(this.createUrl(path, search), { method: 'DELETE' });
    return this.processResponse(res);
  }

  async get<T = any>(path?: string, search?: Record<string, Primitive>) {
    const res = await fetch(this.createUrl(path, search), { method: 'GET' });
    return this.processResponse<T>(res);
  }

  async patch<T = any, U = any>(
    path?: string,
    body?: U | BodyInit,
    search?: Record<string, Primitive>
  ) {
    const res = await fetch(this.createUrl(path, search), {
      headers: {
        'Content-Type':
          body instanceof FormData ? 'multipart/form-data' : 'application/json',
      },
      body:
        body && body instanceof FormData
          ? body
          : body && body instanceof Object
          ? JSON.stringify(body)
          : undefined,
      method: 'PATCH',
    });
    return this.processResponse<T>(res);
  }

  async post<T = any, U = any>(
    path?: string,
    body?: U | FormData,
    search?: Record<string, Primitive>
  ) {
    const res = await fetch(this.createUrl(path, search), {
      headers: {
        'Content-Type':
          body instanceof FormData ? 'multipart/form-data' : 'application/json',
      },
      body:
        body && body instanceof FormData
          ? body
          : body && body instanceof Object
          ? JSON.stringify(body)
          : undefined,
      method: 'POST',
    });
    return this.processResponse<T>(res);
  }
}
