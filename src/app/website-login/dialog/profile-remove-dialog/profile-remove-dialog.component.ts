import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'profile-remove-dialog',
  templateUrl: './profile-remove-dialog.component.html',
  styleUrls: ['./profile-remove-dialog.component.css']
})
export class ProfileRemoveDialogComponent {
  public form: FormGroup;
  public appProfiles: string[] = [];

  constructor(public dialogRef: MatDialogRef<ProfileRemoveDialogComponent>, fb: FormBuilder) {
    this.appProfiles = getAppProfiles().filter(p => p !== 'postybirb'); // don't allow delete of primary

    this.form = fb.group({
      profile: [undefined, [Validators.required]]
    });
  }

  public removeProfile(): void {
    const values = this.form.value;
    this.dialogRef.close(values.profile);
  }
}
