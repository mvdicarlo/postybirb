import { Component } from '@angular/core';
import { TemplateManagerService } from '../../services/template-manager.service';
import { Template } from '../../interfaces/template.interface';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'template-management-dialog',
  templateUrl: './template-management-dialog.component.html',
  styleUrls: ['./template-management-dialog.component.css']
})
export class TemplateManagementDialog {
  public templates: Template[] = [];

  constructor(private _templateManager: TemplateManagerService, private dialog: MatDialog) {
    this.templates = _templateManager.getTemplates();
  }

  public canSaveTemplate(template: Template): boolean {
    template.name = (template.name || '').trim();
    if (template.name && template.name.length >= 1) {
      let collissionCount: number = 0;
      for (let i = 0; i < this.templates.length; i++) {
          const t = this.templates[i];
          if (template.id === t.id) continue;

          if ((t.name || '').trim() === template.name) collissionCount++;
      }

      return collissionCount === 0;
    }

    return false;
  }

  public deleteTemplate(template: Template): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete'
      }
    }).afterClosed()
    .subscribe(result => {
      if (result) {
        this._templateManager.deleteTemplate(template.id);
        this.templates = this._templateManager.getTemplates();
      }
    });
  }

  public saveTemplate(template: Template): void {
    if (this.canSaveTemplate(template)) {
      this._templateManager.renameTemplate(template.id, template.name.trim());
      this.templates = this._templateManager.getTemplates();
    }
  }

}
