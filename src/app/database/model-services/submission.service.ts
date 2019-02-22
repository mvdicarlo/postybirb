import { Injectable, isDevMode } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission, FileMap, SubmissionType } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { SubmissionFileDBService } from './submission-file.service';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { Observable, Subject } from 'rxjs';
import { SubmissionCache } from '../services/submission-cache.service';
import { ISubmissionFile, SubmissionFileType } from '../tables/submission-file.table';
import { ScheduleWriterService } from '../services/schedule-writer.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {
  private notifySubject: Subject<void> = new Subject();
  public changes: Observable<void> = this.notifySubject.asObservable();

  constructor(
    private _submissionFileDB: SubmissionFileDBService,
    private _generatedThumbnailDB: GeneratedThumbnailDBService,
    private _cache: SubmissionCache,
    private _scheduleWriter: ScheduleWriterService
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

  public async delete(ids: number[], deleteFiles: boolean = true): Promise<void> {
    if (deleteFiles) {
      this._submissionFileDB.deleteBySubmissionId(ids);
      this._generatedThumbnailDB.deleteBySubmissionId(ids);
    }

    await this.connection.remove({
      from: SubmissionTableName,
      where: {
        id: {
          in: ids
        }
      }
    });

    ids.forEach(id => this._cache.remove(id));
    this.notifySubject.next();
    this._updateScheduleWriter();
  }

  public async duplicate(id: number, title?: string): Promise<void> {
    const submission: Submission = this._cache.get(id);
    if (submission) {
      const copy = Object.assign({}, submission.asISubmission());
      copy.title = title;
      delete copy.id;
      const inserts = await this.createSubmissions([copy]);
      const duplicateSubmission = inserts[0];
      if (duplicateSubmission && duplicateSubmission.submissionType === SubmissionType.SUBMISSION) {
        const files: ISubmissionFile[] = await this._submissionFileDB.duplicateWithSubmissionId(id, duplicateSubmission.id);
        const fileMap: FileMap = {
          ADDITIONAL: []
        };

        files.forEach(file => {
          if (file.fileType === SubmissionFileType.PRIMARY_FILE) {
            fileMap.PRIMARY = file.id;
          } else if (file.fileType === SubmissionFileType.THUMBNAIL_FILE) {
            fileMap.THUMBNAIL = file.id;
          } else if (file.fileType === SubmissionFileType.ADDITIONAL_FILE) {
            fileMap.ADDITIONAL.push(file.id);
          }
        });

        duplicateSubmission.fileMap = fileMap;
      }
    }

    this.notifySubject.next();
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
      }).finally(() => {
        if (fieldName === 'isScheduled' || fieldName === 'schedule') {
          this._updateScheduleWriter();
        }
      });
    }
  }

  private _updateScheduleWriter(): void {
    this._scheduleWriter.update(this._cache.getAll());
  }

}
