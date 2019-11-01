import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BlobUrlRegistry {
  private registeredBlobUrls: string[] = [];

  constructor() { }

  public createUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.registeredBlobUrls.push(url);
    return url;
  }

  public removeUrl(url: string): void {
    const index: number = this.registeredBlobUrls.indexOf(url);
    if (index !== -1) this.registeredBlobUrls.splice(index, 1);
    URL.revokeObjectURL(url);
  }
}
