import { Injectable } from '@angular/core';
import { Website } from '../decorators/website-decorator';

@Injectable({
  providedIn: 'root'
})
@Website({})
export class Weasyl {

  constructor() { }
}
