import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'loading-overlay',
  templateUrl: './loading-overlay.component.html',
  styleUrls: ['./loading-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingOverlay {
  @Output() readonly stop: EventEmitter<void> = new EventEmitter();

  @Input()
  get mode(): string { return this._mode }
  set mode(loading: string) {
    this._mode = loading;
    this._changeDetector.detectChanges();
  }
  private _mode: string = 'buffer';

  @Input()
  get loading(): boolean { return this._loading }
  set loading(loading: boolean) {
    this._loading = loading;
    this._changeDetector.detectChanges();
  }
  private _loading: boolean = false;

  @Input()
  get allowStop(): boolean { return this._allowStop }
  set allowStop(allowStop: boolean) {
    this._allowStop = allowStop;
    this._changeDetector.markForCheck();
  }
  private _allowStop: boolean = false;

  @Input()
  get faStopIcon(): string { return this._faStopIcon }
  set faStopIcon(allowStop: string) {
    this._faStopIcon = allowStop;
    this._changeDetector.markForCheck();
  }
  private _faStopIcon: string;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  public emitStop(): void {
    this.stop.emit();
  }

}
