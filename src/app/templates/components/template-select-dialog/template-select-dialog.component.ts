import { Component } from '@angular/core';
import { TemplateManagerService } from '../../services/template-manager.service';
import { Template } from '../../interfaces/template.interface';
import { FormControl, Validators } from '@angular/forms';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

@Component({
  selector: 'template-select-dialog',
  templateUrl: './template-select-dialog.component.html',
  styleUrls: ['./template-select-dialog.component.css']
})
export class TemplateSelectDialog {
  public templates: Template[] = [];
  public submissions: Template[] = [];
  public selectControl: FormControl = new FormControl(null, [Validators.required]);

  constructor(templateManager: TemplateManagerService, submissionCache: SubmissionCache) {
    this.templates = templateManager.getTemplates();
    this.submissions = submissionCache.getAll().map(s => {
      return {
        data: copyObject(s.formData),
        name: s.title || ((s.fileInfo && s.fileInfo.name) || ''),
        id: undefined
      }
    });
  }

}
