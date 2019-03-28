import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { FileMetadata } from 'src/app/utils/helpers/file-reader.helper';
import { TemplateManagerService } from 'src/app/templates/services/template-manager.service';

@Component({
  selector: 'collect-submission-info-dialog',
  templateUrl: './collect-submission-info-dialog.component.html',
  styleUrls: ['./collect-submission-info-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectSubmissionInfoDialog {
  public sizeMap: any = {};
  public templates: any = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: FileMetadata[], _templateManager: TemplateManagerService) {
    this.templates = _templateManager.getTemplates();
  }

}
