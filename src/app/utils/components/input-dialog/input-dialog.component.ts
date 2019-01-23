import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material';

export interface InputDialogOptions {
  title: string;
  minLength: number;
  maxLength: number;
  startingValue?: string;
}

@Component({
  selector: 'input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrls: ['./input-dialog.component.css']
})
export class InputDialog {
  public inputForm: FormGroup;
  public title: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: InputDialogOptions, fb: FormBuilder) {
    this.title = data.title;

    // Could probably do this  with a simple FormControl instead of a FormGroup
    this.inputForm = fb.group({
      input: [data.startingValue || null, [Validators.minLength(data.minLength || 1), Validators.maxLength(data.maxLength || 255)]]
    });
  }

}
