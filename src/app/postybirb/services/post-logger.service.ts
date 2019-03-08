import { Injectable, isDevMode } from '@angular/core';
import { Submission, PostStats } from 'src/app/database/models/submission.model';
import { ISubmission } from 'src/app/database/tables/submission.table';

export interface PostyBirbLog {
  submission: ISubmission;
  success: boolean;
  post: PostStats;
  created: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostLoggerService {
  private readonly FILE_NAME: string = 'postybirb_post_logs';

  constructor() { }

  public async addLog(submission: Submission): Promise<void> {
    const logs: PostyBirbLog[] = await this.getLogs() || [];
    logs.push({
      submission: submission.asISubmission(),
      post: submission.postStats,
      success: submission.postStats.fail.length === 0,
      created: (new Date()).toUTCString()
    });

    if (logs.length > 10) {
      logs.shift();
    }

    writeJsonToFile(this.FILE_NAME, logs);
    if (isDevMode()) {
      console.info('Submission Log written', logs[logs.length - 1]);
    }
  }

  public getLogs(): Promise<PostyBirbLog[]> {
    return readJsonFile(this.FILE_NAME);
  }
}
