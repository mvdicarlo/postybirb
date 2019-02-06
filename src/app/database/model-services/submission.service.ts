import { Injectable, isDevMode } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { SubmissionFileDBService } from './submission-file.service';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {
  private notifySubject: Subject<void> = new Subject();
  public changes: Observable<void> = this.notifySubject.asObservable();

  constructor(private _submissionFileDB: SubmissionFileDBService, private _generatedThumbnailDB: GeneratedThumbnailDBService) {
    super();
  }

  public async getSubmissions(): Promise<Submission[]> {
    const results: ISubmission[] = await this.connection.select({
      from: SubmissionTableName
    });

    return results.map(r => new Submission(r));
  }

  public getISubmissions(): Promise<ISubmission[]> {
    return this.connection.select({ from: SubmissionTableName });
  }

  public getSubmissionById(id: number): Promise<Submission> {
    return this.connection.select({
      from: SubmissionTableName,
      where: {
        id
      }
    }).then((results: ISubmission[]) => {
      return results[0] ? new Submission(results[0]) : null;
    });
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

  public delete(ids: number[], deleteFiles: boolean = true): Promise<any> {
    if (deleteFiles) {
      this._submissionFileDB.deleteBySubmissionId(ids);
      this._generatedThumbnailDB.deleteBySubmissionId(ids);
    }

    return this.connection.remove({
      from: SubmissionTableName,
      where: {
        id: {
          in: ids
        }
      }
    }).then(() => this.notifySubject.next());
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
          console.info(`Updated submission (${id}) [${fieldName.toUpperCase()}]=`, value);
        }
      }).catch(err => {
        if (isDevMode()) {
          console.error(`Unable to update ${id}`, err);
        }
      });
    }
  }
}
