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

  private createUrl(
    path?: string,
    search?: Record<string, Primitive | Primitive[]>
  ): string {
    const url = new URL(`${this.url}/${path ?? ''}`);
    if (search) {
      Object.entries(search).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            url.searchParams.append(
              key,
              typeof v === 'string' ? v : JSON.stringify(v)
            );
          });
        } else {
          url.searchParams.append(
            key,
            typeof value === 'string' ? value : JSON.stringify(value)
          );
        }
      });
    }

    return url.toString();
  }

  private processBody<U>(body: U | BodyInit | undefined) {
    if (body) {
      if (body instanceof FormData) {
        return body;
      }

      if (body instanceof Object) {
        return JSON.stringify(body);
      }

      if (typeof body === 'string') {
        return body;
      }
    }

    return undefined;
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

    let resBody: T = {} as T;
    try {
      resBody = (await res.json()) as T;
    } catch {
      // Do nothing
    }

    const result: FetchResult<T> = {
      status: res.status,
      statusText: res.statusText,
      body: resBody,
    };

    return result;
  }

  async delete<T>(
    path?: string,
    search?: Record<string, Primitive | Primitive[]>
  ) {
    const res = await fetch(this.createUrl(path, search), { method: 'DELETE' });
    return this.processResponse<T>(res);
  }

  async get<T>(path?: string, search?: Record<string, Primitive>) {
    const res = await fetch(this.createUrl(path, search), { method: 'GET' });
    return this.processResponse<T>(res);
  }

  async patch<T, U>(
    path?: string,
    body?: U | BodyInit,
    search?: Record<string, Primitive | Primitive[]>
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (body instanceof FormData) {
      delete headers['Content-Type'];
    }
    const res = await fetch(this.createUrl(path, search), {
      headers,
      body: this.processBody(body),
      method: 'PATCH',
    });
    return this.processResponse<T>(res);
  }

  async post<T, U>(
    path?: string,
    body?: U | FormData,
    search?: Record<string, Primitive | Primitive[]>
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (body instanceof FormData) {
      delete headers['Content-Type'];
    }
    const res = await fetch(this.createUrl(path, search), {
      headers,
      body: this.processBody<U>(body),
      method: 'POST',
    });
    return this.processResponse<T>(res);
  }
}
