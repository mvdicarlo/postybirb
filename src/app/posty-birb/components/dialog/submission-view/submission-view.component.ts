import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmission } from '../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'submission-view',
  templateUrl: './submission-view.component.html',
  styleUrls: ['./submission-view.component.css']
})
export class SubmissionViewComponent implements OnInit {

  public description: string;
  public tags: string[];
  public title: string;
  public submissionType: string;
  public submissionRating: string;
  public file: any;
  public websites: string[];

  public websiteOptions: any = {};

  constructor(@Inject(MAT_DIALOG_DATA) private data: PostyBirbSubmission) {
    this.getFields(data);

    this.websites.forEach(website => {
      this.websiteOptions[website] = data.getAllForWebsite(website);
    });
  }

  ngOnInit() {
  }

  public getFields(submission: PostyBirbSubmission): void {
    submission.getPreloadedSubmissionFile().then(file => this.file = file);
    this.submissionType = submission.getSubmissionType();
    this.submissionRating = submission.getSubmissionRating();
    this.title = submission.getTitle();
    this.description = (submission.getDefaultFieldFor('defaultDescription') || {}).description || '';
    this.tags = (submission.getDefaultFieldFor('defaultTags') || {}).tags || [];
    this.websites = submission.getUnpostedWebsites() || [];
  }

}
