import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

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

  constructor(private _changeDetector: ChangeDetectorRef) { }

  public toggleHelp() {
    this.toggle = !this.toggle;
    this._changeDetector.markForCheck();
  }

}
