import { ISubmission, SubmissionRating, SubmissionType, FileMap } from '../tables/submission.table';
import { Subject, Observable } from 'rxjs';
import { FileObject } from '../tables/submission-file.table';

export interface SubmissionChange {
  [key: string]: {
    old: any;
    current: any;
    validate?: boolean;
  };
}

export class Submission implements ISubmission {
  private changeSubject: Subject<SubmissionChange> = new Subject();
  public readonly changes: Observable<SubmissionChange>;

  public id: number;
  public submissionType: SubmissionType;

  get fileInfo(): FileObject { return this._fileInfo }
  set fileInfo(file: FileObject) {
    this._emitChange('fileInfo', this._fileInfo, file);
    this._fileInfo = file;
  }
  private _fileInfo: FileObject;

  get schedule(): any { return this._schedule }
  set schedule(schedule: any) {
    this._emitChange('schedule', this._schedule, schedule);
    this._schedule = schedule;
  }
  private _schedule: any;

  get title(): string { return this._title }
  set title(title: string) {
    title = (title || '').trim();
    this._emitChange('title', this._title, title);
    this._title = title;
  }
  private _title: string;

  get rating(): SubmissionRating { return this._rating }
  set rating(rating: SubmissionRating) {
    this._emitChange('rating', this._rating, rating, true);
    this._rating = rating;
  }
  private _rating: SubmissionRating;

  // Need to be careful about setting these - have to pass back in the whole object
  get fileMap(): FileMap { return this._fileMap }
  set fileMap(fileMap: FileMap) {
    this._emitChange('fileMap', this._fileMap, fileMap);
    this._fileMap = fileMap;
  }
  private _fileMap: FileMap;

  constructor(submission: ISubmission) {
    this.id = submission.id;
    this.title = submission.title;
    this.schedule = submission.schedule;
    this.submissionType = submission.submissionType;
    this.rating = submission.rating;
    this.fileInfo = submission.fileInfo;
    this.fileMap = submission.fileMap;

    this.changes = this.changeSubject.asObservable();
  }

  /**
   * Cleans up subscription/subject when object is being destroyed
   */
  public cleanUp(): void {
    this.changeSubject.complete();
  }

  private _emitChange(fieldName: string, old: any, current: any, validate: boolean = false): void {
    if (old != current) {
      this.changeSubject.next({
        [fieldName]: {
          old,
          current,
          validate
        }
      });
    }
  }
}
