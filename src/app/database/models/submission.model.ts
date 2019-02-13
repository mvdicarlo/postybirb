import { ISubmission, SubmissionRating, SubmissionType, FileMap } from '../tables/submission.table';
import { Subject, Observable } from 'rxjs';
import { FileObject } from '../tables/submission-file.table';

export interface SubmissionChange {
  [key: string]: {
    old: any;
    current: any;
    validate?: boolean;
    noUpdate?: boolean;
  };
}

export class Submission implements ISubmission {
  private changeSubject: Subject<SubmissionChange> = new Subject();
  public readonly changes: Observable<SubmissionChange>;

  public id: number;
  public submissionType: SubmissionType;

  get fileInfo(): FileObject { return this._fileInfo }
  set fileInfo(file: FileObject) {
    const old = this._fileInfo;
    this._fileInfo = file;
    this._emitChange('fileInfo', old, file);
  }
  private _fileInfo: FileObject;

  get schedule(): any { return this._schedule }
  set schedule(schedule: any) {
    const old = this._schedule;
    this._schedule = schedule;
    this._emitChange('schedule', old, schedule, true);
    if (!schedule && this.isScheduled) {
      this.isScheduled = false;
    }
  }
  private _schedule: any;

  get isScheduled(): boolean { return this._isScheduled }
  set isScheduled(isScheduled: boolean) {
    const old = this._isScheduled;
    this._isScheduled = isScheduled;
    this._emitChange('isScheduled', old, isScheduled);
  }
  private _isScheduled: boolean = false;

  get title(): string { return this._title }
  set title(title: string) {
    title = (title || '').trim();
    const old = this._title;
    this._title = title;
    this._emitChange('title', old, title);
  }
  private _title: string;

  get rating(): SubmissionRating { return this._rating }
  set rating(rating: SubmissionRating) {
    const old = this._rating;
    this._rating = rating;
    this._emitChange('rating', old, rating, true);
  }
  private _rating: SubmissionRating;

  // Need to be careful about setting these - have to pass back in the whole object
  get fileMap(): FileMap { return this._fileMap }
  set fileMap(fileMap: FileMap) {
    const old = this._fileMap;
    this._fileMap = fileMap;
    this._emitChange('fileMap', old, fileMap);
  }
  private _fileMap: FileMap;

  get formData(): any { return this._formData }
  set formData(formData: any) {
    const old = this._formData;
    this._formData = formData;
    this._emitChange('formData', old, formData, true);
  }
  private _formData: any; // TODO interface when I have a good understanding of the structure

  get problems(): string[] { return this._problems }
  set problems(problems: string[]) {
    this._problems = problems || [];
    this.flagUpdate('problems');
  }
  private _problems: string[] = [];

  get queued(): boolean { return this._queued }
  set queued(queued: boolean) {
    const old = this._queued;
    this._queued = queued;
    this._emitChange('queued', old, queued);
  }
  private _queued: boolean = false; // variable that tracks whether or not the submissions is queued

  get posting(): boolean { return this._posting }
  set posting(posting: boolean) {
    const old = this._posting;
    this._posting = posting;
    this._emitChange('posting', old, posting);
  }
  private _posting: boolean = false; // variable that tracks whether or not the submissions is posting

  constructor(submission: ISubmission) {
    this.id = submission.id;
    this.title = submission.title;
    this.isScheduled = submission.isScheduled;
    this.schedule = submission.schedule;
    this.submissionType = submission.submissionType;
    this.rating = submission.rating;
    this.fileInfo = submission.fileInfo;
    this.fileMap = submission.fileMap;
    this.formData = submission.formData || {};

    this.changes = this.changeSubject.asObservable();
  }

  public asISubmission(): ISubmission {
    const { id, rating, title, schedule, submissionType, fileInfo, fileMap, formData } = this;
    return {
      id,
      rating,
      title,
      schedule,
      submissionType,
      fileInfo,
      fileMap,
      formData
    };
  }

  /**
   * Cleans up subscription/subject when object is being destroyed
   */
  public cleanUp(): void {
    this.changeSubject.complete();
  }

  /**
   * Emits an update event for a field that does not trigger any validation or updates naturally
   * @param fieldName Fieldname provided in the event
   */
  public flagUpdate(fieldName: string): void {
    this.changeSubject.next({
      [fieldName]: { noUpdate: true, old: null, current: null, validate: false }
    });
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
