import { Component, ViewChild } from '@angular/core';
import { TagTemplate, TagTemplatesService } from 'src/app/utils/services/tag-templates.service';
import { TagGroupInputField } from './tag-group-input-field/tag-group-input-field.component';

@Component({
  selector: 'tag-group-management-dialog',
  templateUrl: './tag-group-management-dialog.component.html',
  styleUrls: ['./tag-group-management-dialog.component.css']
})
export class TagGroupManagementDialog {
  @ViewChild('newTemplateField') newTemplateField: TagGroupInputField;

  public templates: TagTemplate[] = [];

  constructor(private _tagTemplates: TagTemplatesService) {
    this.templates = _tagTemplates.getTemplates();
  }

  public saveNewTemplate(template: TagTemplate): void {
    this._tagTemplates.saveTemplate(template.id, template);
    this.templates = this._tagTemplates.getTemplates();
    this.newTemplateField.form.reset();
  }

  public updateTemplate(template: TagTemplate): void {
    this._tagTemplates.saveTemplate(template.id, template);
    this.templates = this._tagTemplates.getTemplates();
  }

  public deleteTemplate(id: string): void {
    this._tagTemplates.removeTemplate(id);
    this.templates = this._tagTemplates.getTemplates();
  }

}
