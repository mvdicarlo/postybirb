import { Component, OnInit, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ImageCroppedEvent } from 'ngx-image-cropper';

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
    this.base64 = nativeImage
    .createFromBuffer(data)
    .resize({
      width: 840,
      height: 840
    })
    .toDataURL();
    this.cropped64 = data;
  }

  ngOnInit() {
  }

  public cropped(crop: ImageCroppedEvent): void {
    this.cropped64 = new Uint8Array(Buffer.from(crop.base64.split('base64,')[1], 'base64').buffer);
    this._changeDetector.markForCheck();
  }

}
