import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild
} from '@angular/core';
import { Observable, Subject, fromEvent } from 'rxjs';
import { startWith, debounceTime, filter, switchMap, share, takeUntil, switchMapTo } from 'rxjs/operators';
import { ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'popup',
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupComponent implements OnInit, OnDestroy {
  @Input() overlayOrigin: any;
  @Input() offsetX: any;
  @Input() offsetY: any;
  @Output() readonly close = new EventEmitter<any>();
  @Output() readonly open = new EventEmitter<any>();

  @Input()
  get positions(): ConnectedPosition[] { return this._positions }
  set positions(positions: ConnectedPosition[]) { this._positions = positions }
  private _positions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'bottom',
    },
  ];

  @ViewChild('dialog') dialog: ElementRef;
  public isOpened = false;
  private destroy$ = new Subject<any>();

  constructor(private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    const overlayOriginEl = this.overlayOrigin.elementRef.nativeElement;

    // open popup if mouse stopped in overlayOriginEl (for short time).
    // If user just quickly got over overlayOriginEl element - do not open
    const open$ = fromEvent(overlayOriginEl, 'mouseenter')
      .pipe(
        filter(() => !this.isOpened),
        switchMap(enterEvent =>
          fromEvent(document, 'mousemove')
            .pipe(startWith(enterEvent), debounceTime(50), filter(event => overlayOriginEl === event['target']))
        ),
        share());

    open$.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.changeState(true));

    // close if mouse left the overlayOriginEl and dialog(after short delay)
    const close$ = fromEvent(document, 'mousemove')
      .pipe(debounceTime(100), filter(() => this.isOpened), filter(event => this.isMovedOutside(overlayOriginEl, this.dialog, event)))

    open$.pipe(
      takeUntil(this.destroy$),
      switchMapTo(close$)
    ).subscribe(() => {
      this.changeState(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  connectedOverlayDetach() {
    this.changeState(false);
  }

  private changeState(isOpened: boolean) {
    this.isOpened = isOpened;
    isOpened ? this.open.emit() : this.close.emit();
    this.changeDetectorRef.markForCheck();
  }

  private isMovedOutside(overlayOriginEl, dialog, event): boolean {
    return !(overlayOriginEl.contains(event['target']) || dialog.nativeElement.contains(event['target']));
  }
}
