import { UpdateState } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class UpdateApi {
  private client = new HttpClient('update');

  checkForUpdates() {
    return this.client.get<UpdateState>('');
  }

  startUpdate() {
    return this.client.post<undefined>('start');
  }

  installUpdate() {
    return this.client.post<undefined>('install');
  }
}

export default new UpdateApi();
