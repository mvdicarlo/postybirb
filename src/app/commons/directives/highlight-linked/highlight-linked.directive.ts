import { Directive, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { HighlightLinkedService } from './highlight-linked.service';

@Directive({
  selector: '[highlightLinked]',
  host: {
    '[class.linked-highlight]': 'isActive()'
  }
})
export class HighlightLinkedDirective implements OnInit, OnDestroy, OnChanges {
  @Input() highlightLinked: any;
  @Input() highlightEnabled: boolean = true;

  public shouldHighlight: boolean = false;

  /** The currently selected options. */
  private _modelChanges: Subscription = Subscription.EMPTY;

  constructor(private _element: ElementRef, private _highlightService: HighlightLinkedService) {

  }

  ngOnInit() {
    this._modelChanges = this._highlightService.listen(this.highlightLinked).subscribe(event => {
      if (event.added) {
        if (event.added.id === this.highlightLinked && event.added.count > 1) {
          this.shouldHighlight = true && this.highlightEnabled;
        }
      }

      if (event.removed) {
        if (event.removed.id === this.highlightLinked) {
          this.shouldHighlight = false;
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.highlightEnabled) {
        this.highlightEnabled = changes.highlightEnabled.currentValue;
        if (!this.highlightEnabled && this.shouldHighlight) {
          this.shouldHighlight = false;
        }
      }
    }
  }

  ngOnDestroy() {
    this._modelChanges.unsubscribe();
    this._highlightService.unlisten(this.highlightLinked);
  }

  public isActive(): boolean {
    return this.shouldHighlight;
  }

  @HostListener('mouseenter') onMouseEnter() {
    this._highlightService.selected(this.highlightLinked);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this._highlightService.deselected(this.highlightLinked);
  }

}
