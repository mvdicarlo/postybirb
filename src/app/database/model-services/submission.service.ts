import { Injectable, isDevMode } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { SubmissionFileDBService } from './submission-file.service';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { Observable, Subject } from 'rxjs';
import { SubmissionCache } from '../services/submission-cache.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {
  private notifySubject: Subject<void> = new Subject();
  public changes: Observable<void> = this.notifySubject.asObservable();

  constructor(
    private _submissionFileDB: SubmissionFileDBService,
    private _generatedThumbnailDB: GeneratedThumbnailDBService,
    private _cache: SubmissionCache
  ) {
    super();
    _cache.setUpdateCallback(this.update.bind(this));
  }

  public async getSubmissions(): Promise<Submission[]> {
    const results: ISubmission[] = await this.connection.select({
      from: SubmissionTableName
    });

    const submissions: Submission[] = results.map(r => {
      if (this._cache.exists(r.id)) return this._cache.get(r.id);
      else return this._cache.store(new Submission(r));
    });

    return submissions;
  }

  public getISubmissions(): Promise<ISubmission[]> {
    return this.connection.select({ from: SubmissionTableName });
  }

  public getSubmissionById(id: number): Promise<Submission> {
    if (this._cache.exists(id)) {
      return Promise.resolve(this._cache.get(id));
    }

    return this.connection.select({
      from: SubmissionTableName,
      where: {
        id
      }
    }).then((results: ISubmission[]) => {
      return results[0] ? this._cache.store(new Submission(results[0])) : null;
    });
  }

  public async createSubmissions(submissions: ISubmission[]): Promise<Submission[]> {
    const inserts: ISubmission[] = <ISubmission[]>await this.connection.insert({
      into: SubmissionTableName,
      values: submissions,
      upsert: true,
      return: true
    });

    return inserts.map(i => this._cache.store(new Submission(i)));
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
    })
    .then(() => ids.forEach(id => this._cache.remove(id)))
    .then(() => this.notifySubject.next());
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
