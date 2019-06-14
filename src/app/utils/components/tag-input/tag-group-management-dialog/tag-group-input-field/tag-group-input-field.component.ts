import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TagTemplate } from 'src/app/utils/services/tag-templates.service';

@Component({
  selector: 'tag-group-input-field',
  templateUrl: './tag-group-input-field.component.html',
  styleUrls: ['./tag-group-input-field.component.css'],
})
export class TagGroupInputField implements OnInit {
  @Output()
  private readonly save: EventEmitter<TagTemplate> = new EventEmitter();

  @Output()
  private readonly remove: EventEmitter<string> = new EventEmitter();

  @Input() template: TagTemplate;
  get canDelete(): boolean { return !!this.template };

  public form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      tags: [null, Validators.required],
      title: [null, Validators.required]
    });
  }

  ngOnInit() {
    if (this.template) {
      this.form.controls.title.setValue(this.template.title);
      this.form.controls.tags.setValue({
        extend: true,
        tags: this.template.tags
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
    if (!template.tags.length) return false;
    return true;
  }

  private _getTemplate(): TagTemplate {
    const values = this.form.value;
    return {
      id: this.template ? this.template.id : null,
      title: values.title,
      tags: (values.tags || {}).tags || []
    };
  }

}
