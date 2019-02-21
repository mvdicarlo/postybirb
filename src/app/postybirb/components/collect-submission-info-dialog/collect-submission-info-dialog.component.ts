import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ReadFile } from 'src/app/utils/helpers/file-reader.helper';
import { isImage, isGIF } from 'src/app/utils/helpers/file.helper';
import { TemplateManagerService } from 'src/app/templates/services/template-manager.service';

@Component({
  selector: 'collect-submission-info-dialog',
  templateUrl: './collect-submission-info-dialog.component.html',
  styleUrls: ['./collect-submission-info-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectSubmissionInfoDialog implements OnInit {
  public sizeMap: any = {};
  public templates: any = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: ReadFile[], _templateManager: TemplateManagerService) {
    this.templates = _templateManager.getTemplates();
    
    data.filter(rf => isImage(rf.file) && !isGIF(rf.file))
      .forEach((rf: any) => {
        const ni = nativeImage.createFromBuffer(Buffer.from(rf.buffer));
        const sizes: any = ni.getSize();
        rf.width = sizes.width;
        rf.height = sizes.height;

        rf.originalWidth = sizes.width;
        rf.originalHeight = sizes.height;
      });
  }

  ngOnInit() {
  }

}
