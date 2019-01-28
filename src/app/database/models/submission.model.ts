import { ISubmission, SubmissionRating, SubmissionType } from '../tables/submission.table';
import { Subject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export class Submission implements ISubmission {
  private changeSubject: Subject<Submission> = new Subject();
  public readonly changes: Observable<Submission>;

  public id: number;
  public title: string;
  public schedule: any; // number or date
  public submissionType: SubmissionType;

  // things that may require validation
  get rating(): SubmissionRating { return this._rating }
  set rating(rating: SubmissionRating) {
    this._rating = rating;
    this.changeSubject.next(this);
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
