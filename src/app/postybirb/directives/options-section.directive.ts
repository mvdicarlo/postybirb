import { Directive, ViewContainerRef, ComponentFactoryResolver, Input, OnInit, AfterViewInit, Type, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';

import { BaseOptionForm } from '../components/base-option-form/base-option-form.component';
import { OptionsForms } from '../models/website-options.model';

export interface OptionSection {
  component: Type<BaseOptionForm>;
  requiredFields?: string[];
}

@Directive({
  selector: 'options-section'
})
export class OptionsSectionDirective implements OnInit, AfterViewInit {
  @Input() website: string;
  @Input() control: FormControl;
  @Output() readonly optionChanges: EventEmitter<any> = new EventEmitter();

  private section: OptionSection;

  public component: BaseOptionForm;

  constructor(public viewContainerRef: ViewContainerRef, private cfr: ComponentFactoryResolver) { }

  ngOnInit() {
    this.section = OptionsForms[this.website];

    if (this.section) {
      this.component = (<BaseOptionForm>this.viewContainerRef.createComponent(this.cfr.resolveComponentFactory(this.section.component)).instance);
    }
  }

  ngAfterViewInit() {
    if (this.control.value) this.component.optionsForm.patchValue(this.control.value); // put in initial values from template or existing options
    this.control.patchValue(this.component.optionsForm.value || {}, { emitEvent: false }); //get vals for checking
    this.component.optionsForm.valueChanges.subscribe(values => { // subscribe to changes and push up
      this.control.setValue(values, { emitEvent: false });
      this.optionChanges.emit();
    });

    this.control.valueChanges.subscribe(values => { // listen to templates and resets
      values ? this.component.optionsForm.patchValue(values, { emitEvent: false }) : this.component.clear();
    });
  }

  public isComplete(): boolean {
    if (this.section) {
      return this.component.optionsForm.valid;
    }

    return true;
  }

}
