import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toBase64'
})
export class ToBase64Pipe implements PipeTransform {

  transform(buffer: Uint8Array, size: number = 100): any {
    if (!buffer) return null;

    const nib: any = nativeImage.createFromBuffer(Buffer.from(buffer));
    const resizedImg = nib.resize({
      width: Number(size),
      height: Number(size),
      quality: 'better'
    });

    return `data:image/jpeg;charset=utf-8;base64,${Buffer.from(resizedImg.toJPEG(80)).toString('base64')}`;
  }

}
