import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toBase64'
})
export class ToBase64Pipe implements PipeTransform {

  transform(buffer: Uint8Array, size: number = 100): any {
    if (!buffer) return '#';

    const nib: any = nativeImage.createFromBuffer(Buffer.from(buffer));
    const resizedImg = nib.resize({
      width: Number(size),
      height: Number(size),
      quality: 'better'
    });

    return resizedImg.toDataURL();
  }

}
