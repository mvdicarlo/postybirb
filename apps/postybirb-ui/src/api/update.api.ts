import { HttpClient } from '../transports/http-client';

interface ReleaseNoteInfo {
  /**
   * The version.
   */
  readonly version: string;
  /**
   * The note.
   */
  readonly note: string | null;
}

type UpdateState = {
  updateAvailable?: boolean;
  updateDownloaded?: boolean;
  updateDownloading?: boolean;
  updateError?: string;
  updateProgress?: number;
  updateNotes?: ReleaseNoteInfo[];
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
