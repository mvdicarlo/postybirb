import { Component, ViewChild } from '@angular/core';
import { DescriptionTemplatesService, DescriptionTemplate } from 'src/app/utils/services/description-templates.service';
import { DescriptionTemplateInputField } from './description-template-input-field/description-template-input-field.component';

@Component({
  selector: 'description-template-management-dialog',
  templateUrl: './description-template-management-dialog.component.html',
  styleUrls: ['./description-template-management-dialog.component.css']
})
export class DescriptionTemplateManagementDialog {
  @ViewChild('newTemplateField') newTemplateField: DescriptionTemplateInputField;

  public templates: DescriptionTemplate[] = [];

  constructor(private _descriptionTemplates: DescriptionTemplatesService) {
    this.templates = _descriptionTemplates.getTemplates();
  }

  public saveNewTemplate(template: DescriptionTemplate): void {
    this._descriptionTemplates.saveTemplate(template.id, template);
    this.templates = this._descriptionTemplates.getTemplates();
    this.newTemplateField.form.reset();
  }

  public updateTemplate(template: DescriptionTemplate): void {
    this._descriptionTemplates.saveTemplate(template.id, template);
    this.templates = this._descriptionTemplates.getTemplates();
  }

  public deleteTemplate(id: string): void {
    this._descriptionTemplates.removeTemplate(id);
    this.templates = this._descriptionTemplates.getTemplates();
  }
}
