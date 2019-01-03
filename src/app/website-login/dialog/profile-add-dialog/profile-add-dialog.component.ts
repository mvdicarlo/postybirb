import { Component } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'profile-add-dialog',
  templateUrl: './profile-add-dialog.component.html',
  styleUrls: ['./profile-add-dialog.component.css']
})
export class ProfileAddDialogComponent {
  public form: FormGroup;

  constructor(public dialogRef: MatDialogRef<ProfileAddDialogComponent>, fb: FormBuilder) {
    this.form = fb.group({
      profileName: [undefined, [Validators.required, Validators.minLength(2), Validators.maxLength(32)]]
    });
  }

  public validLength(): boolean {
    return (this.form.value.profileName || '').trim().length >= 2;
  }

  public createProfile(): void {
    const values = this.form.value;
    this.dialogRef.close(values.profileName.trim());
  }
}
