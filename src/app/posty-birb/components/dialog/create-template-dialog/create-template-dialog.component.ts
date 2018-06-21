import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialog } from '@angular/material';

@Component({
  selector: 'create-template-dialog',
  templateUrl: './create-template-dialog.component.html'
})
export class CreateTemplateDialogComponent {
  public form: FormGroup;

  constructor(public dialogRef: MatDialogRef<CreateTemplateDialogComponent>, private fb: FormBuilder) {
    this.form = fb.group({
      templateName: [undefined, [Validators.required, Validators.minLength(4)]]
    });
  }

  public acceptTemplate(): void {
    const values = this.form.value;
    this.dialogRef.close(values.templateName);
  }

}
