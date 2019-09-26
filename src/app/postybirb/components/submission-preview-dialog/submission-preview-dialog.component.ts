import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { PostManagerService } from '../../services/post-manager.service';
import { Submission } from 'src/app/database/models/submission.model';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'submission-preview-dialog',
  templateUrl: './submission-preview-dialog.component.html',
  styleUrls: ['./submission-preview-dialog.component.css']
})
export class SubmissionPreviewDialog implements OnInit {

  public websites: any = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: Submission, private _postManager: PostManagerService) { }

  ngOnInit() {
    this.data.formData.websites.forEach(website => {
      const registry = WebsiteRegistry.getConfigForRegistry(website);
      const submissionData = this._postManager.getSimpleSubmissionPostData(website, this.data);
      this.websites[registry.websiteConfig.displayedName] = submissionData;
    });
  }

}
