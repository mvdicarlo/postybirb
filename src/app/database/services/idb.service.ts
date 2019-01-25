import { Injectable } from '@angular/core';
import * as JsStore from 'jsstore';
import * as workerPath from 'file-loader?name=scripts/[name].[hash].js!jsstore/dist/jsstore.worker.min.js';

@Injectable({
  providedIn: 'root'
})
export class IdbService {
  static idbCon = new JsStore.Instance(new Worker(workerPath));

  constructor() { }
}
