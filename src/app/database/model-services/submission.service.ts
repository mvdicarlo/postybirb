import { Injectable, isDevMode } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { SubmissionFileDBService } from './submission-file.service';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {

  constructor(private _submissionFileDB: SubmissionFileDBService, private _generatedThumbnailDB: GeneratedThumbnailDBService) {
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

  public delete(id: number): void {
    this.connection.remove({
      from: SubmissionTableName,
      where: {
        id: id
      }
    });

    this._submissionFileDB.deleteBySubmissionId(id);
    this._generatedThumbnailDB.deleteBySubmissionId(id);
  }

  public update(id: number, fieldName: string, value: any): void {
    if (id && fieldName) {
      this.connection.update({
        in: SubmissionTableName,
        set: {
          [fieldName]: value
        },
        where: {
          id
        }
      }).then(() => {
        if (isDevMode()) {
          console.info(`Updated submission (${id}) [${fieldName.toUpperCase()}]=${value}`);
        }
      }).catch(err => {
        if (isDevMode()) {
          console.error(`Unable to update ${id}`, err);
        }
      });
    }
  }
}
