import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private _cache: { [key: string]: any } = {};

  constructor() { }

  public get(id: string): any {
    const obj: any = this._cache[id];
    if (!obj) {
      console.warn(`${id} not in cache`);
    }

    return obj || null;
  }

  public store(id: string, obj: any): any {
    this._cache[id] = obj;
    return obj;
  }

  public remove(id: string): void {
    delete this._cache[id];
  }

  public exists(id: string): boolean {
    return this._cache[id] ? true : false;
  }
}
