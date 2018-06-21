import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle, SafeScript, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safe'
})
/**
 * Pipe used to sanitize a url into safe version for angular
 */
export class SafePipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }

  public transform(value: any, type: string = 'url'): SafeHtml | SafeStyle | SafeScript | SafeUrl | SafeResourceUrl {
    switch (type) {
   			case 'html': return this.sanitizer.bypassSecurityTrustHtml(value);
   			case 'style': return this.sanitizer.bypassSecurityTrustStyle(value);
   			case 'script': return this.sanitizer.bypassSecurityTrustScript(value);
   			case 'url': return this.sanitizer.bypassSecurityTrustUrl(value);
   			case 'resourceUrl': return this.sanitizer.bypassSecurityTrustResourceUrl(value);
   			default: throw new Error(`Invalid safe type specified: ${type}`);
    }
  }

}
