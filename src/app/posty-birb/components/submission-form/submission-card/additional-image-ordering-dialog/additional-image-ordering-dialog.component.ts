import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';

@Component({
  selector: 'additional-image-ordering-dialog',
  templateUrl: './additional-image-ordering-dialog.component.html',
  styleUrls: ['./additional-image-ordering-dialog.component.css']
})
export class AdditionalImageOrderingDialogComponent implements OnInit {
  public additionalFiles: any[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: PostyBirbSubmission, public dialogRef: MatDialogRef<AdditionalImageOrderingDialogComponent>) { }

  ngOnInit() {
    this.data.getPreloadedAdditionalFiles().then(files => this.additionalFiles = files);
  }

  public save(): void {
    this.data.setAdditionalFiles(this.additionalFiles);
    this.dialogRef.close();
  }

  public moveUp(img: any): void {
    let index = this.additionalFiles.indexOf(img);
    if (index !== 0) {
      index -= 1;
      const original = this.additionalFiles[index];
      this.additionalFiles[index] = img;
      this.additionalFiles[index + 1] = original;
    }
  }

  public moveDown(img: any): void {
    let index = this.additionalFiles.indexOf(img);
    if (index !== this.additionalFiles.length - 1) {
      index += 1;
      const original = this.additionalFiles[index];
      this.additionalFiles[index] = img;
      this.additionalFiles[index - 1] = original;
    }
  }

}
