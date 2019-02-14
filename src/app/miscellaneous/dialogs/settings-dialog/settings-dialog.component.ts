import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialog implements OnInit {

  public settingsForm: FormGroup;

  constructor(fb: FormBuilder, private dialog: MatDialog) {
    settingsDB.defaults({
      hardwareAcceleration: true,
      postInterval: 0,
      clearQueueOnFailure: true,
      advertise: true
    });

    this.settingsForm = fb.group({
      hardwareAcceleration: [true],
      postInterval: [0],
      clearQueueOnFailure: [true],
      advertise: [true]
    });

    this.settingsForm.patchValue(settingsDB.getState(), { emitEvent: false });
  }

  ngOnInit() {
    this.settingsForm.controls.hardwareAcceleration.valueChanges.subscribe(hardwareAcceleration => {
      this.dialog.open(ConfirmDialog, {
        data: {
          title: 'Requires App Restart'
        }
      }).afterClosed()
        .subscribe(restart => {
          if (restart) {
            settingsDB.set('hardwareAcceleration', hardwareAcceleration).write();
            relaunch();
          } else {
            this.settingsForm.controls.hardwareAcceleration.patchValue(!hardwareAcceleration, { emitEvent: false }); // set back to what it was
          }
        });
    });

    this.settingsForm.controls.postInterval.valueChanges.subscribe(postInterval => {
      settingsDB.set('postInterval', Math.max(postInterval, 0)).write();
    });

    this.settingsForm.controls.clearQueueOnFailure.valueChanges.subscribe(clearQueueOnFailure => {
      settingsDB.set('clearQueueOnFailure', clearQueueOnFailure).write();
    });

    this.settingsForm.controls.advertise.valueChanges.subscribe(advertise => {
      settingsDB.set('advertise', advertise).write();
    });
  }

}
