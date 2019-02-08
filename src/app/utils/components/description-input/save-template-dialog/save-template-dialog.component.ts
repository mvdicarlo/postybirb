import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'save-template-dialog',
  templateUrl: './save-template-dialog.component.html',
  styleUrls: ['./save-template-dialog.component.css']
})
export class SaveTemplateDialog {
  public form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: string, fb: FormBuilder) {
    this.form = fb.group({
      title: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(100)]],
      content: [data || '', Validators.required]
    });
  }

}
