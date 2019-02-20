import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { WebsiteRegistry } from 'src/app/websites/registries/website.registry';

@Component({
  selector: 'website-shortcuts',
  templateUrl: './website-shortcuts.component.html',
  styleUrls: ['./website-shortcuts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-inline-block'
  }
})
export class WebsiteShortcutsComponent {
  public toggle: boolean = true;
  public codes: any[] = [];

  constructor(private _changeDetector: ChangeDetectorRef) {
    const registered = WebsiteRegistry.getRegistered();
    Object.keys(registered).forEach(key => {
      const config = registered[key].websiteConfig;

      if (config.parsers.usernameShortcut) {
        this.codes.push({
          name: config.displayedName,
          code: config.parsers.usernameShortcut.code
        });
      }
    });

    this.codes = this.codes.sort((a, b) => {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
  }

  public toggleHelp() {
    this.toggle = !this.toggle;
    this._changeDetector.markForCheck();
  }

}
