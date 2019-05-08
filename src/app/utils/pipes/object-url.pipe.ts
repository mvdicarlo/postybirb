import { Pipe, PipeTransform } from '@angular/core';
import { arrayBufferAsBlob } from '../helpers/file.helper';

@Pipe({
  name: 'objectURL'
})
export class ObjectURLPipe implements PipeTransform {

  transform(blob: Blob, size: number = 100): any {
    if (!blob) return './assets/other-images/missing_img.png';

    const b: Blob = blob instanceof Uint8Array ? arrayBufferAsBlob(<Uint8Array>blob, 'image/jpeg') : blob
    // NOTE: size is deprecated for now since its only really used for blobs that have been resize
    return URL.createObjectURL(b);
  }

}
