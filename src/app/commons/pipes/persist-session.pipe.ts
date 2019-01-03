import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'persistSession'
})
export class PersistSessionPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    return getPartition();
  }

}
