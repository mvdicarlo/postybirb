import { Component, OnInit, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';

@Component({
  selector: 'image-cropper-dialog',
  templateUrl: './image-cropper-dialog.component.html',
  styleUrls: ['./image-cropper-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageCropperDialog implements OnInit {
  public base64: string;
  public cropped64: Uint8Array;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Uint8Array, private _changeDetector: ChangeDetectorRef) {
    let ni = nativeImage.createFromBuffer(data);
    if (MBtoBytes(2) < data.length) {
      const sizes = ni.getSize();

      ni = ni
      .resize({
        width: Math.min(840, sizes.width),
        height: Math.min(840, sizes.height)
      });
    }


    this.base64 = ni.toDataURL();
    this.cropped64 = data;
  }

  ngOnInit() {
  }

  public cropped(crop: ImageCroppedEvent): void {
    this.cropped64 = new Uint8Array(Buffer.from(crop.base64.split('base64,')[1], 'base64').buffer);
    this._changeDetector.markForCheck();
  }

}
