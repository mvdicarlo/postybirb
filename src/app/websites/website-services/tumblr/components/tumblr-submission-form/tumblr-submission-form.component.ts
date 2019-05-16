import { Component, OnInit, Injector, forwardRef, AfterViewInit } from '@angular/core';
import { BaseWebsiteSubmissionForm, HOST_DATA } from 'src/app/websites/components/base-website-submission-form/base-website-submission-form.component';
import { Tumblr } from '../../tumblr.service';

@Component({
  selector: 'tumblr-submission-form',
  templateUrl: './tumblr-submission-form.component.html',
  styleUrls: ['./tumblr-submission-form.component.css'],
  providers: [{ provide: BaseWebsiteSubmissionForm, useExisting: forwardRef(() => TumblrSubmissionForm) }],
  host: HOST_DATA
})
export class TumblrSubmissionForm extends BaseWebsiteSubmissionForm implements OnInit, AfterViewInit {

  public optionDefaults: any = {
      blog: [],
      useTitle: [true]
    };

  public blogs: string[] = [];

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.blogs = (<Tumblr>this.websiteService).getBlogs(this.parentForm.getLoginProfileId()) || [];
    if (!this.formGroup.get('options')) this.formGroup.addControl('options', this.formBuilder.group(this.optionDefaults));
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
    if (this.blogs) {
      this.resetOnConflict('blog', this.blogs);
    }
  }

}
