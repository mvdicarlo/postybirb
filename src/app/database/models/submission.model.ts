import { ISubmission, SubmissionRating, SubmissionType } from '../tables/submission.table';
import { Subject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export class Submission implements ISubmission {
  private changeSubject: Subject<any> = new Subject();
  public readonly changes: Observable<any>;

  public id: number;
  public schedule: any; // number or date
  public submissionType: SubmissionType;

  get title(): string { return this._title }
  set title(title: string) {
    title = (title || '').trim();
    if (title !== this._title) {
      const valueChanges: any = {
        old: this._title,
        current: title
      };

      this._title = title;

      this.changeSubject.next({
        title: valueChanges
      });
    }
  }
  private _title: string;

  get rating(): SubmissionRating { return this._rating }
  set rating(rating: SubmissionRating) {
    if (rating !== this._rating) {
      const valueChanges: any = {
        old: this._rating,
        current: rating
      };

      this._rating = rating;

      this.changeSubject.next({
        rating: valueChanges
      });
    }
  }
  private _rating: SubmissionRating;

  constructor(submission: ISubmission) {
    this.id = submission.id;
    this.title = submission.title;
    this.schedule = submission.schedule;
    this.submissionType = submission.submissionType;
    this.rating = submission.rating;

    this.changes = this.changeSubject.asObservable().pipe(debounceTime(250));
  }

  /**
   * Cleans up subscription/subject when object is being destroyed
   */
  public cleanUp(): void {
    this.changeSubject.complete();
  }
}
