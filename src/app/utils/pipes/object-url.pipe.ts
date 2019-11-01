import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { arrayBufferAsBlob } from '../helpers/file.helper';
import { BlobUrlRegistry } from '../services/blob-url-registry.service';

@Pipe({
  name: 'objectURL'
})
export class ObjectURLPipe implements PipeTransform, OnDestroy {
  private url: string;

  constructor(private registry: BlobUrlRegistry) { }

  // NOTE: size is deprecated for now since its only really used for blobs that have been resize
  transform(blob: Blob, size: number = 100): any {
    if (!blob) return './assets/other-images/missing_img.png';

    const b: Blob = blob instanceof Uint8Array ? arrayBufferAsBlob(<Uint8Array>blob, 'image/jpeg') : blob
    this.url = this.registry.createUrl(b);
    return this.url;
  }

  ngOnDestroy() {
    this.registry.removeUrl(this.url);
  }

}
