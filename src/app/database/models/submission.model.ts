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
    this._emitChange('schedule', old, schedule);
  }
  private _schedule: any;

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

  constructor(submission: ISubmission) {
    this.id = submission.id;
    this.title = submission.title;
    this.schedule = submission.schedule;
    this.submissionType = submission.submissionType;
    this.rating = submission.rating;
    this.fileInfo = submission.fileInfo;
    this.fileMap = submission.fileMap;
    this.formData = submission.formData || {};

    this.changes = this.changeSubject.asObservable();
  }

  /**
   * Cleans up subscription/subject when object is being destroyed
   */
  public cleanUp(): void {
    this.changeSubject.complete();
  }

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
