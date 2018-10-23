import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material';
import { SnotifyService } from 'ng-snotify';

import { ConfirmDialogComponent } from '../../../../commons/components/confirm-dialog/confirm-dialog.component';
import { SubmissionViewComponent } from '../submission-view/submission-view.component';
import { TemplatesService, Template } from '../../../services/templates/templates.service';
import { PostyBirbSubmissionModel } from '../../../models/postybirb-submission-model';

@Component({
  selector: 'manage-templates-dialog',
  templateUrl: './manage-templates-dialog.component.html',
  styleUrls: ['./manage-templates-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageTemplatesDialogComponent {
  public templates: Template[] = [];

  constructor(private dialog: MatDialog, private templateService: TemplatesService, private _changeDetector: ChangeDetectorRef, private snotify: SnotifyService) {
    this.templates = templateService.getTemplates();
  }

  public async openSummaryDialog(template: Template) {
    this.dialog.open(SubmissionViewComponent, {
      data: PostyBirbSubmissionModel.fromArchive(template.template),
      width: '80%'
    });
  }

  public async deleteTemplate(template: Template) {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.templateService.deleteTemplate(template.name);
        this.templates = this.templateService.getTemplates();
        this._changeDetector.markForCheck();
      }
    });
  }

  public async deleteAll() {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete All' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.templateService.deleteAll();
        this.templates = [];
        this._changeDetector.markForCheck();
      }
    });
  }

  public async renameTemplate(template: any) {
    if (this.templateService.nameExists(template.rename.trim())) {
      this.snotify.warning(`Template name "${template.rename}" already exists.`);
    } else {
      this.templateService.renameTemplate(template.name, template.rename.trim());
      template.name = template.rename;
      delete template.editing;
      delete template.rename;
      delete template.target;
      this._changeDetector.markForCheck();
    }
  }

  public renamingTemplate(template: any, event: KeyboardEvent): void {
    template.editing = true;
    template.rename = event.target['value'].trim();
    template.target = event.target;
    this._changeDetector.markForCheck();
  }

  public async clearRenaming(template: any) {
    delete template.editing;
    delete template.rename;
    template.target['value'] = template.name;
    delete template.target;
    this._changeDetector.markForCheck();
  }

  public templateExists(template: any): boolean {
    return this.templateService.nameExists(template.rename.trim());
  }

  public canSave(template: any): boolean {
    if (template && template.rename) {
      if (this.templateExists(template)) return false;
      return template.rename.trim().length >= 2
    }

    return false;
  }

}
