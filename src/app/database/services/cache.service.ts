import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  protected _cache: { [key: string]: any } = {};

  constructor() { }

  public get(id: any): any {
    const obj: any = this._cache[id];
    if (!obj) {
      console.warn(`${id} not in cache`);
    }

    return obj || null;
  }

  public store(id: any, obj: any): any {
    this._cache[id] = obj;
    return obj;
  }

  public remove(id: any): void {
    delete this._cache[id];
  }

  public exists(id: any): boolean {
    return this._cache[id] ? true : false;
  }
}
