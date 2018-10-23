import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Template, TemplatesService } from '../../services/templates/templates.service';

@Component({
  selector: 'form-template-select',
  templateUrl: './form-template-select.component.html',
  styleUrls: ['./form-template-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormTemplateSelectComponent implements OnInit, OnDestroy {
  @Output() onSelect: EventEmitter<any> = new EventEmitter(); // emits submission archive

  private subscriber: Subscription = Subscription.EMPTY;

  public templates: Template[];
  public control: FormControl = new FormControl();

  constructor(private template: TemplatesService, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.subscriber = this.template.asObserver().subscribe((templates) => {
      this.templates = templates;
      this._changeDetector.markForCheck()
    });

    this.control.valueChanges.subscribe(value => this.onChange(value));
  }

  ngOnDestroy() {
    this.subscriber.unsubscribe();
  }

  public trackBy(index, template: Template) {
    return template.name;
  }

  public onChange(value: any): void {
    if (value) {
      this.emit(value);
    }

    this._changeDetector.markForCheck()
  }

  private emit(template: Template): void {
    this.onSelect.emit(template.template);
  }

  public reset(): void {
    this.control.reset();
  }

}
