import { Component, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'loading-overlay',
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingOverlay {
  @Input()
  get loading(): boolean { return this._loading }
  set loading(loading: boolean) {
    this._loading = loading;
    this._changeDetector.detectChanges();
  }
  private _loading: boolean = false;

  constructor(private _changeDetector: ChangeDetectorRef) { }

}
