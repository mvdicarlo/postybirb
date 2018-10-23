import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'create-template-dialog',
  templateUrl: './create-template-dialog.component.html'
})
export class CreateTemplateDialogComponent {
  public form: FormGroup;

  constructor(public dialogRef: MatDialogRef<CreateTemplateDialogComponent>, private fb: FormBuilder) {
    this.form = fb.group({
      templateName: [undefined, [Validators.required, Validators.minLength(2), Validators.maxLength(32)]]
    });
  }

  public validLength(): boolean {
    return (this.form.value.templateName || '').trim().length >= 2;
  }

  public acceptTemplate(): void {
    const values = this.form.value;
    this.dialogRef.close(values.templateName.trim());
  }

}
