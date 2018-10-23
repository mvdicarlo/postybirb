import { Component, OnInit, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';

@Component({
  selector: 'fa-species-select',
  templateUrl: './fa-species-select.component.html',
  styleUrls: ['./fa-species-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FaSpeciesSelectComponent),
      multi: true,
    }
  ]
})
export class FaSpeciesSelectComponent extends BaseControlValueAccessorComponent implements OnInit, ControlValueAccessor {

  constructor() {
    super();
  }

  ngOnInit() {
    this.value = '1';
  }

  public onChange(event: any) {
    this.onChangedCallback(event.value);
  }

}
