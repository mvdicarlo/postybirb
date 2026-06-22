import type { ProxyPoolEntry } from '@postybirb/types';
import {
  getLocalBaseUrl,
  getLocalServerPassword,
  HttpClient,
} from '../transports/http-client';

export type ProxyConnectionTestResult = {
  success: boolean;
  message: string;
};

class ProxyApi {
  private readonly client: HttpClient = new HttpClient('proxy');

  /** Local Electron Nest — used for client-scope proxy when connected to a remote host. */
  private readonly localClient: HttpClient = new HttpClient(
    'proxy',
    getLocalBaseUrl,
    getLocalServerPassword,
  );

  testPoolEntryConnection(poolEntry: ProxyPoolEntry) {
    return this.client.post<ProxyConnectionTestResult>(
      'pool/test',
      poolEntry,
    );
  }

  testLocalPoolEntryConnection(poolEntry: ProxyPoolEntry) {
    return this.localClient.post<ProxyConnectionTestResult>(
      'pool/test',
      poolEntry,
    );
  }
}

export default new ProxyApi();
