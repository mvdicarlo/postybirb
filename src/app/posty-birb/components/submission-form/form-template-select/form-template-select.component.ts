import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Template, TemplatesService } from '../../../services/templates/templates.service';

@Component({
  selector: 'form-template-select',
  templateUrl: './form-template-select.component.html',
  styleUrls: ['./form-template-select.component.css']
})
export class FormTemplateSelectComponent implements OnInit, OnDestroy {
  @Output() onSelect: EventEmitter<Template> = new EventEmitter();

  private subscriber: Subscription = Subscription.EMPTY;

  public templates: Template[];
  public control: FormControl = new FormControl();

  constructor(private template: TemplatesService) { }

  ngOnInit() {
    this.subscriber = this.template.asObserver().subscribe((templates) => {
      this.templates = templates;
    });

    this.control.valueChanges.subscribe(value => this.onChange(value));
  }

  ngOnDestroy() {
    this.subscriber.unsubscribe();
  }

  public onChange(value: any): void {
    if (value) {
      this.emit(value);
    }
  }

  private emit(template: Template): void {
    this.onSelect.emit(template);
  }

  public reset(): void {
    this.control.reset();
  }

}
