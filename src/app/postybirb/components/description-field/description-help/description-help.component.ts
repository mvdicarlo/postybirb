import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'description-help',
  templateUrl: './description-help.component.html',
  styleUrls: ['./description-help.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DescriptionHelpComponent {
  public toggle: boolean = true;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  public toggleHelp() {
    this.toggle = !this.toggle;
    this._changeDetector.markForCheck();
  }

}
