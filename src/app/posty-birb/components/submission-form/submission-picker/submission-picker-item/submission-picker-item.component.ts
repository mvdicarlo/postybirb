import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { timer } from 'rxjs/observable/timer';
import { debounce } from 'rxjs/operators';

import { SupportedWebsiteRestrictions, Restrictions } from '../../../../models/supported-websites-restrictions';
import { PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'submission-picker-item',
  templateUrl: './submission-picker-item.component.html',
  styleUrls: ['./submission-picker-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmissionPickerItemComponent implements OnInit, OnDestroy {
  @Input() submission: PostyBirbSubmission;
  @Input() readOnly: boolean = false;
  @Output() select: EventEmitter<PostyBirbSubmission> = new EventEmitter();

  public isSelected: boolean = false;
  public title: string;
  public type: string;
  public src: string;
  public invalidFlags: Restrictions;

  private subscription: Subscription = Subscription.EMPTY;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.getInfo(this.submission);
    this.subscription = this.submission.observe().pipe(debounce(() => timer(100)))
      .subscribe((submission) => this.getInfo(submission));

    this.invalidFlags = SupportedWebsiteRestrictions.getSupportedWebsites(this.submission.getSubmissionRating(), this.submission.getSubmissionType(), this.submission.getSubmissionFileObject());
    this.trimInvalidWebsites();
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

  private trimInvalidWebsites(): void {
    const allSelectedWebsites = this.submission.getDefaultFieldFor('selectedWebsites') || [];

    this.invalidFlags.unsupportedByExtension = this.invalidFlags.unsupportedByExtension.filter(website => allSelectedWebsites.includes(website));
    this.invalidFlags.unsupportedByFileSize = this.invalidFlags.unsupportedByFileSize.filter(website => allSelectedWebsites.includes(website));
    this.invalidFlags.unsupportedByRating = this.invalidFlags.unsupportedByRating.filter(website => allSelectedWebsites.includes(website));
    this.invalidFlags.unsupportedByType = this.invalidFlags.unsupportedByType.filter(website => allSelectedWebsites.includes(website));

    this.invalidFlags.hasInvalid =
      this.invalidFlags.unsupportedByExtension.length > 0 ||
      this.invalidFlags.unsupportedByFileSize.length > 0 ||
      this.invalidFlags.unsupportedByRating.length > 0 ||
      this.invalidFlags.unsupportedByType.length > 0;
  }

  public getInvalidWebsites(): string {
    const websites: string[] = [];

    const all = [
      ...this.invalidFlags.unsupportedByExtension,
      ...this.invalidFlags.unsupportedByFileSize,
      ...this.invalidFlags.unsupportedByRating,
      ...this.invalidFlags.unsupportedByType
    ];

    all.forEach(website => {
      if (!websites.includes(website)) {
        websites.push(website);
      }
    });

    return websites.join(', ');
  }
}
