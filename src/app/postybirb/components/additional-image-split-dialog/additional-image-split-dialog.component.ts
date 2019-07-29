import { Component, OnInit, Inject } from '@angular/core';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { Submission } from 'src/app/database/models/submission.model';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'additional-image-split-dialog',
  templateUrl: './additional-image-split-dialog.component.html',
  styleUrls: ['./additional-image-split-dialog.component.css']
})
export class AdditionalImageSplitDialog implements OnInit {
  public splitWebsites: string[] = []

  constructor(@Inject(MAT_DIALOG_DATA) public data: Submission) {
    this.splitWebsites = WebsiteRegistry.getRegisteredAsArray()
      .filter(entry => !entry.websiteConfig.additionalFiles)
      .filter(entry => data.formData.websites.includes(entry.name))
      .map(entry => entry.websiteConfig.displayedName);
  }

  ngOnInit() {
  }

}
