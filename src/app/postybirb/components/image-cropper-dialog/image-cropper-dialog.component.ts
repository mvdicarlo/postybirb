import { Component, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'image-cropper-dialog',
  templateUrl: './image-cropper-dialog.component.html',
  styleUrls: ['./image-cropper-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageCropperDialog {
  public base64: string;
  public cropped64: Uint8Array;
  public ratio: number = 1/1;
  public originalRatio: number = 1/1;
  public ratioControl = new FormControl([1/1]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: Uint8Array, private _changeDetector: ChangeDetectorRef) {
    let ni = nativeImage.createFromBuffer(data);
    const aspectRatio = ni.getAspectRatio();
    this.ratio = aspectRatio;
    this.originalRatio = aspectRatio;
    if (MBtoBytes(2) < data.length) {
      const sizes = ni.getSize();
      const newWidth: number = Math.min(840, sizes.width);
      ni = ni
      .resize({
        width: newWidth,
        height: newWidth / aspectRatio
      });
    }

    this.base64 = ni.toDataURL();
    this.cropped64 = data;

    this.ratioControl.valueChanges.subscribe(value => this.changeRatio(value));

    this.ratioControl.patchValue(this.originalRatio);
  }

  public cropped(crop: ImageCroppedEvent): void {
    this.cropped64 = new Uint8Array(Buffer.from(crop.base64.split('base64,')[1], 'base64').buffer);
    this._changeDetector.markForCheck();
  }

  public changeRatio(value): void {
    this.ratio = value;
    this._changeDetector.markForCheck();
  }

}
