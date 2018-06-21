import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'base-control-value-accessor',
  template: `<div></div>`,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BaseControlValueAccessorComponent),
    multi: true,
  }]
})
/**
 * Generic Callbacks for ControlValueAccessor
 * @tutorial https://angular.io/api/forms/ControlValueAccessor
 */
export class BaseControlValueAccessorComponent implements ControlValueAccessor {
  protected onTouchedCallback = (_: any) => { };
  protected onChangedCallback = (_: any) => { };

  /**
   * Default Value (not mandatory to use)
   */
  public value: any;

  /**
   * Reference to formControlName in FormGroup
   */
  @Input() formControlName: string;

  public onBlur(event?: any): void {
    this.onTouchedCallback(event);
  }

  public onChange(event: any): void {
    this.onChangedCallback(event);
  }

  public writeValue(value: any): void {
    this.value = value;
  }

  public registerOnChange(fn: any) {
    this.onChangedCallback = fn;
  }

  public registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

}
