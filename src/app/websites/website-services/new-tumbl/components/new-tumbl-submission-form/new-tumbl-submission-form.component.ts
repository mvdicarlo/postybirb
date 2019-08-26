import { Component, OnInit, forwardRef, Injector, AfterViewInit } from '@angular/core';
import { HOST_DATA, BaseWebsiteSubmissionForm } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { NewTumbl } from '../../new-tumbl.service';

@Component({
  selector: 'new-tumbl-submission-form',
  templateUrl: './new-tumbl-submission-form.component.html',
  styleUrls: ['./new-tumbl-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => NewTumblSubmissionForm) }],
  host: HOST_DATA
})
export class NewTumblSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
    ratingOverride: [null],
    blog: [null]
  };

  public blogs: any[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.blogs = (<NewTumbl>this.websiteService).getBlogs(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.blogs) {
      this.resetOnConflict('blog', this.blogs.map(b => b.id));
    }
  }

}
