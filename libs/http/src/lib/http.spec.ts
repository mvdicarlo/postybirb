import * as http from 'http';
import { Http } from './http';

class TestServer {
  private server: http.Server;

  constructor() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/test') {
        res.write('hello');
        res.end();
        return;
      }

      if (req.url === '/redirect') {
        res.writeHead(302, {
          Location: 'http://localhost:3000/test',
        });
        res.end();
        return;
      }

      if (req.url === '/json') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ test: 'hello' }));
      }
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(3000, resolve);
    });
  }

  public stop(): void {
    this.server.close();
  }
}

const server = new TestServer();

beforeAll(() => server.start());
afterAll(() => server.stop());

describe('http', () => {
  it('should retrieve server response', async () => {
    const res = await Http.get<string>('http://localhost:3000/test', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toBe('hello');
  });

  it('should follow redirect', async () => {
    const res = await Http.get<string>('http://localhost:3000/redirect', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toBe('hello');
    expect(res.responseUrl).toBe('http://localhost:3000/test');
  });

  it('should parse json', async () => {
    const res = await Http.get<{ test: string }>('http://localhost:3000/json', {
      partition: 'test',
    });

    expect(res).toBeTruthy();
    expect(res.body).toEqual({ test: 'hello' });
  });
});
