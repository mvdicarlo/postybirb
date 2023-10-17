import { HttpClient } from '../transports/http-client';

type UpdateState = {
  updateAvailable?: boolean;
  updateDownloaded?: boolean;
  updateDownloading?: boolean;
  updateError?: string;
  updateProgress?: number;
  updateNotes?: string;
};

class UpdateApi {
  private client = new HttpClient('update');

  checkForUpdates() {
    return this.client.get<UpdateState>('');
  }

  startUpdate() {
    return this.client.post<undefined>('start');
  }
}

export default new UpdateApi();
