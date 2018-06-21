import { Component, OnInit } from '@angular/core';
import { SupportedWebsiteRestrictions } from '../../../models/supported-websites-restrictions';

@Component({
  selector: 'submission-rule-help-dialog',
  templateUrl: './submission-rule-help-dialog.component.html',
  styleUrls: ['./submission-rule-help-dialog.component.css']
})
export class SubmissionRuleHelpDialogComponent implements OnInit {
  websiteRules: any[] = [];

  constructor() { }

  ngOnInit() {
    const rules = SupportedWebsiteRestrictions.getSupported();
    for (let rule in rules) {
      const obj = rules[rule];
      const ruleObj = {
        supportedRatings: obj.supportedRatings,
        supportedTypes: obj.supportedTypes,
        supportedFiles: obj.supportedFileTypes.sort().join(', '),
        name: rule
      };

      this.websiteRules.push(ruleObj);
    }
  }

}
