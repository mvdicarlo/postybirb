import { Injectable, isDevMode } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { SubmissionTableName, ISubmission, FileMap, SubmissionType } from '../tables/submission.table';
import { Submission } from '../models/submission.model';
import { SubmissionFileDBService } from './submission-file.service';
import { GeneratedThumbnailDBService } from './generated-thumbnail.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { SubmissionCache } from '../services/submission-cache.service';
import { ISubmissionFile, SubmissionFileType, FileObject } from '../tables/submission-file.table';
import { ScheduleWriterService } from '../services/schedule-writer.service';
import { SubmissionState } from '../services/submission-state.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionDBService extends DatabaseService {
  private initializedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public readonly onInitialized: Observable<boolean> = this.initializedSubject.asObservable();

  constructor(
    private _submissionFileDB: SubmissionFileDBService,
    private _generatedThumbnailDB: GeneratedThumbnailDBService,
    private _cache: SubmissionCache,
    private _scheduleWriter: ScheduleWriterService,
    private _state: SubmissionState
  ) {
    super();
    _cache.setUpdateCallback(this.update.bind(this));
    this._validateDatabase();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.getSubmissions();
    this.initializedSubject.next(true);
  }

  public async getSubmissions(): Promise<Submission[]> {
    const results: ISubmission[] = await this.connection.select({
      from: SubmissionTableName
    });

    const submissions: Submission[] = results.map(r => {
      if (this._cache.exists(r.id)) return this._cache.get(r.id);
      else {
        const s = this._cache.store(new Submission(r));
        this._state.append(s);
        return s;
      }
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

    return inserts.map(i => {
      const s = this._cache.store(new Submission(i));
      this._state.append(s);
      return s;
    });
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

    ids.forEach(id => {
      this._cache.remove(id)
      this._state.remove(id);
    });
    this._updateScheduleWriter();
  }

  public async duplicate(id: number, title?: string): Promise<void> {
    const submission: Submission = this._cache.get(id);
    if (submission) {
      const copy = Object.assign({}, submission.asISubmission());
      copy.title = title;
      copy.fileMap = null;
      delete copy.id;
      const inserts = await this.createSubmissions([copy]);
      const duplicateSubmission = inserts[0];
      if (duplicateSubmission && duplicateSubmission.submissionType === SubmissionType.SUBMISSION) {
        const files: ISubmissionFile[] = await this._submissionFileDB.duplicateWithSubmissionId(id, duplicateSubmission.id);
        const fileMap: FileMap = {
          ADDITIONAL: []
        };

        const additionalFileInfo: FileObject[] = [];

        files.forEach(file => {
          if (file.fileType === SubmissionFileType.PRIMARY_FILE) {
            fileMap.PRIMARY = file.id;
          } else if (file.fileType === SubmissionFileType.THUMBNAIL_FILE) {
            fileMap.THUMBNAIL = file.id;
          } else if (file.fileType === SubmissionFileType.ADDITIONAL_FILE) {
            fileMap.ADDITIONAL.push(file.id);
            additionalFileInfo.push(file.fileInfo);
          }
        });

        duplicateSubmission.fileMap = fileMap;
        duplicateSubmission.additionalFileInfo = additionalFileInfo;
      }
    }
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

  private async _validateDatabase() {
    try {
      const submissions: ISubmission[] = await this.connection.select({
        from: SubmissionTableName,
      });

      if (submissions && submissions.length) {
        this._submissionFileDB._validateDatabase(submissions.map(s => s.id));
      }
    } catch (e) {
      console.error('Unable to validate database', e);
    }
  }

}
