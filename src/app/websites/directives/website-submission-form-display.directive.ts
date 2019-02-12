import { Directive, ComponentFactoryResolver, ViewContainerRef, Input, OnInit } from '@angular/core';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import { BaseWebsiteSubmissionForm } from '../components/base-website-submission-form/base-website-submission-form.component';
import { WebsiteRegistry } from '../registries/website.registry';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

@Directive({
  selector: '[website-submission-form-display]'
})
export class WebsiteSubmissionFormDisplayDirective implements OnInit {
  @Input() website: string;
  @Input() type: TypeOfSubmission;
  @Input() submissionType: SubmissionType = SubmissionType.SUBMISSION;

  @Input()
  get rating(): SubmissionRating { return this._rating }
  set rating(rating: SubmissionRating) {
    this._rating = rating || SubmissionRating.GENERAL;
    if (this.component) {
      this.component.rating = this._rating;
    }
  }
  private _rating: SubmissionRating = SubmissionRating.GENERAL;

  public component: BaseWebsiteSubmissionForm;
  public instance: any;

  constructor(public viewContainerRef: ViewContainerRef, private cfr: ComponentFactoryResolver) {}

  ngOnInit(): void {
    const config = WebsiteRegistry.getConfigForRegistry(this.website);

    if (this.submissionType === SubmissionType.SUBMISSION) {
      this.component = (<BaseWebsiteSubmissionForm>this.viewContainerRef.createComponent(this.cfr.resolveComponentFactory(<any>config.websiteConfig.components.submissionForm)).instance);
    } else if (this.submissionType === SubmissionType.JOURNAL) {
      this.component = (<BaseWebsiteSubmissionForm>this.viewContainerRef.createComponent(this.cfr.resolveComponentFactory(<any>config.websiteConfig.components.journalForm)).instance);
    }

    this.component.rating = this.rating;
    this.component.type = this.type;
    this.component.website = this.website;
  }

}
