import { Component } from '@angular/core';
import { TemplateManagerService } from '../../services/template-manager.service';
import { Template } from '../../interfaces/template.interface';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'template-select-dialog',
  templateUrl: './template-select-dialog.component.html',
  styleUrls: ['./template-select-dialog.component.css']
})
export class TemplateSelectDialog {
  public templates: Template[] = [];
  public selectControl: FormControl = new FormControl(null, [Validators.required]);

  constructor(templateManager: TemplateManagerService) {
    this.templates = templateManager.getTemplates();
  }

}
