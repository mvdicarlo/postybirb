import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Subscription, timer, Observable } from 'rxjs';
import { debounce } from 'rxjs/operators';

import { SupportedWebsiteRestrictions, WebsiteRestrictions } from '../../../../models/supported-websites-restrictions';
import { PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'submission-picker-item',
  templateUrl: './submission-picker-item.component.html',
  styleUrls: ['./submission-picker-item.component.css'],
})
export class SubmissionPickerItemComponent implements OnInit, OnDestroy {
  @Input() submission: PostyBirbSubmission;
  @Input() readOnly: boolean = false;
  @Input() website: string;
  @Output() select: EventEmitter<PostyBirbSubmission> = new EventEmitter();

  public isSelected: boolean = false;
  public title: string;
  public type: string;
  public src: string;
  public verify: WebsiteRestrictions;
  public restrictions: any;
  public isValid: boolean = true;

  private subscription: Subscription = Subscription.EMPTY;

  constructor(private translate: TranslateService, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.getInfo(this.submission);
    this.subscription = this.submission.observe().pipe(debounce(() => timer(100)))
      .subscribe((submission) => this.getInfo(submission));

    this.verify = SupportedWebsiteRestrictions.verifyWebsiteRestrictions(this.submission);
    this.restrictions = this.verify.verifiedWebsites[this.website];
    this.isValid = Object.keys(this.restrictions).length === 0;
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  private getInfo(submission: PostyBirbSubmission): void {
    const fileInfo: any = this.submission.getSubmissionFileObject();
    this.type = fileInfo.type;
    this.submission.getSubmissionFileSource().then(src => {
      this.src = src;
      this._changeDetector.markForCheck();
    });
    this.title = this.submission.getTitle();

    this._changeDetector.markForCheck();
  }

  public toggle(): void {
    if (!this.readOnly) {
      this.isSelected = !this.isSelected;
      this.emit();
    }
  }

  public emit(): void {
    this.select.emit(this.submission);
  }

  public translateText(keyword: string, additional: string): Observable<string> {
    const strings: string[] = [keyword, additional.toString()];

    return new Observable<string>(observer => {
      this.translate.get(strings).subscribe((value: any) => {
        observer.next(`${value[keyword]}: ${value[additional.toString()]}`);
        observer.complete();
      });
    });
  }
}
