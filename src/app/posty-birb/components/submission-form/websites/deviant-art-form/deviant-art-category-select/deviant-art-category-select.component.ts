import { Component, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { timer, Observable } from 'rxjs';
import { debounce, map } from 'rxjs/operators';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';
import { Categories } from './deviant-art-categories-list';

@Component({
  selector: 'deviant-art-category-select',
  templateUrl: './deviant-art-category-select.component.html',
  styleUrls: ['./deviant-art-category-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DeviantArtCategorySelectComponent),
      multi: true,
    }
  ]
})
export class DeviantArtCategorySelectComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, ControlValueAccessor {
  public control: FormControl = new FormControl();
  public filteredOptions: Observable<string[]>;
  private options: string[] = Categories;
  private clearInterval: any;

  @ViewChild('auto') auto: any;
  @ViewChild('search') search: ElementRef;

  constructor(private _changeDetector: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.filteredOptions = this.control.valueChanges
      .pipe(debounce(() => timer(250)), map(val => this.filter(val)));
  }

  ngOnDestroy() {
    clearInterval(this.clearInterval);
  }

  filter(val: string): string[] {
    return this.options.filter(option =>
      option.toLowerCase().includes(val.toLowerCase()));
  }

  find(val: string): boolean {
    for (let i = 0; i < this.options.length; i++) {
      if (this.options[i] === val.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  public writeValue(category: string) {
    if (category) {
      this.value = category;
      this.control.patchValue(category, { emitEvent: false });
    } else {
      this.value = null;
      this.control.patchValue(null, { emitEvent: false });
    }

    this._changeDetector.detectChanges();
  }

  public onChange(value) {
    if (this.find(value.option.value)) {
      this.value = value.option.value;
    } else {
      this.value = undefined;
    }

    this.onChangedCallback(this.value);

    this.filteredOptions = this.control.valueChanges
      .pipe(debounce(() => timer(250)), map(val => this.filter(val)));
  }

  public onBlur(event: any) {
    clearInterval(this.clearInterval);
    this.clearInterval = setInterval(function() {
      if (!this.auto.isOpen) {
        clearInterval(this.clearInterval);

        this.filteredOptions = this.control.valueChanges
          .pipe(debounce(() => timer(250)), map(val => this.filter(val)));

        this.onChange({ option: { value: this.search.nativeElement.value } })
      }
    }.bind(this), 500);
  }

  public onFocus(value: string): void {
    this.control.patchValue(value);
  }
}
