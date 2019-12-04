import { Component, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';
import { DescriptionTemplate } from 'src/app/utils/services/description-templates.service';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';

@Component({
  selector: 'description-template-input-field',
  templateUrl: './description-template-input-field.component.html',
  styleUrls: ['./description-template-input-field.component.css']
})
export class DescriptionTemplateInputField implements AfterViewInit {
  @Output()
  private readonly save: EventEmitter<DescriptionTemplate> = new EventEmitter();

  @Output()
  private readonly remove: EventEmitter<string> = new EventEmitter();

  @Input() template: DescriptionTemplate;
  get canDelete(): boolean { return !!this.template };

  public form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      description: [null, Validators.required],
      title: [null, Validators.required],
      content: [null, Validators.required],
    });
  }

  ngAfterViewInit() {
    if (this.template) {
      this.form.controls.title.setValue(this.template.title);
      this.form.controls.description.setValue(this.template.description);
      this.form.controls.content.setValue({
        overwrite: false,
        description: this.template.content
      });
    }
  }

  public deleteTemplate(): void {
    this.remove.emit(this.template.id);
  }

  public saveTemplate(): void {
    this.save.emit(this._getTemplate());
  }

  public canSave(): boolean {
    const template = this._getTemplate();
    if (!template.title) return false;
    if (!template.description) return false;
    if (!template.content) return false;
    return true;
  }

  private _getTemplate(): DescriptionTemplate {
    const values = this.form.value;
    return {
      id: this.template ? this.template.id : null,
      title: values.title,
      description: values.description,
      content: (values.content || {}).description || ''
    };
  }
}
