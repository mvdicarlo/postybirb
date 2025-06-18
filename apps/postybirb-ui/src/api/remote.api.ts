import { RemoteSettings } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class RemoteApi {
  private readonly client: HttpClient = new HttpClient('remote');

  /**
   * Test ping against a remote host to validate connection
   * @param password The password configured for remote access
   * @returns Promise<boolean> True if connection is successful
   */
  async testPing(remoteSettings: RemoteSettings) {
    const res = await fetch(
      `https://${remoteSettings.hostUrl}/api/remote/ping/${encodeURIComponent(remoteSettings.password)}`,
    );
    const response = await res.json();
    if (!res.ok) {
      return Promise.reject(response);
    }
    return response;
  }
}

export default new RemoteApi();
