import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';
import { BbCodeParse } from '../../../../commons/helpers/bbcode-parse';

@Component({
  selector: 'submission-view',
  templateUrl: './submission-view.component.html',
  styleUrls: ['./submission-view.component.css']
})
export class SubmissionViewComponent {

  public description: string;
  public tags: string[];
  public title: string;
  public submissionType: string;
  public submissionRating: string;
  public file: any;
  public additionalFiles: any[] = [];
  public websites: string[];

  public websiteOptions: any = {};
  private parser: BbCodeParse;

  constructor(@Inject(MAT_DIALOG_DATA) data: PostyBirbSubmissionModel) {
    this.parser = new BbCodeParse();
    this.getFields(data);
    for (let i = 0; i < this.websites.length; i++) {
      const website = this.websites[i];
      const submissionData = data.getAllForWebsite(website);
      submissionData.description = this.parser.parse(submissionData.description, website, !submissionData.parseDescription).parsed
      this.websiteOptions[website] = submissionData;
    }
  }

  public getFields(submission: PostyBirbSubmissionModel): void {
    submission.getPreloadedSubmissionFile().then(file => this.file = file);
    submission.getPreloadedAdditionalFiles().then(files => this.additionalFiles = files);
    this.submissionType = submission.type;
    this.submissionRating = submission.rating;
    this.title = submission.title;
    this.description = (submission.descriptionInfo.default || {}).description || '';
    this.tags = (submission.tagInfo.default || {}).tags || [];
    this.websites = submission.unpostedWebsites || [];
  }

}
