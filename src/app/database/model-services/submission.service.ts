import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { CacheService } from '../services/cache.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {

  constructor(private _cache: CacheService) {
    super();
  }

  public async getSubmissions(): Promise<Submission[]> {
    const results: ISubmission[] = await this.connection.select({
      from: SubmissionTableName
    });

    return results.map(r => new Submission(r));
  }

  public async createSubmissions(submissions: ISubmission[]): Promise<Submission[]> {
    const inserts: ISubmission[] = <ISubmission[]>await this.connection.insert({
      into: SubmissionTableName,
      values: submissions,
      upsert: true,
      return: true
    });

    return inserts.map(i => new Submission(i));
  }

  public delete(id: string): void {
    this.connection.remove({
      from: SubmissionTableName,
      where: {
        id: id
      }
    }).then(() => {
      this._cache.remove(`${SubmissionTableName}:${id}`);
    });
  }
}
