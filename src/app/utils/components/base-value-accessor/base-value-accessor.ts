import { ControlValueAccessor } from '@angular/forms';

export class BaseValueAccessor implements ControlValueAccessor {
  public disabled: boolean;
  public value: any;

  public _onTouched = (_: any) => { };
  public _onChange = (_: any) => { };

  constructor(defaultValue?: any) {
    this.value = defaultValue;
  }

  public setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  public registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  public registerOnChange(fn: (_: any) => void): void {
    this._onChange = fn;
  }

  public writeValue(obj: any): void {
    this.value = obj;
  }
}
