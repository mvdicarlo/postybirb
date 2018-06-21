import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { SubmissionSettingsDialogComponent } from '../dialog/submission-settings-dialog/submission-settings-dialog.component';

@Component({
  selector: 'pb-gallery',
  templateUrl: './pb-gallery.component.html',
  styleUrls: ['./pb-gallery.component.css']
})
export class PbGalleryComponent {

  constructor(private dialog: MatDialog) { }

  public isAdvertiseEnabled(): boolean {
    const enabled = store.get('globalAdvertise');
    return enabled === undefined ? true : enabled;
  }

  public toggleGlobalAdvertise(event: any): void {
    store.set('globalAdvertise', event.checked);
  }

  public openSettings(): void {
    this.dialog.open(SubmissionSettingsDialogComponent, {});
  }
}
