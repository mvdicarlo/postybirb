/*
* This is a legacy component and there might be a better way to do this
* DeviantArt categories are crap because you can only access them via api which
* is pretty bad imo.
*/

import { Component, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { debounceTime, map } from 'rxjs/operators';
import { Categories } from './deviant-art-categories-list';
import { BaseValueAccessor } from 'src/app/utils/components/base-value-accessor/base-value-accessor';

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
export class DeviantArtCategorySelectComponent extends BaseValueAccessor implements OnInit, OnDestroy, ControlValueAccessor {
  private readonly LOCAL_STORE: string = 'DeviantArtCategoryRecent';
  public control: FormControl = new FormControl();
  public filteredOptions: string[] = [];
  public recent: string[] = [];
  private options: string[] = Categories;
  private clearInterval: any;

  @ViewChild('auto') auto: any;
  @ViewChild('search') search: ElementRef;

  constructor(private _changeDetector: ChangeDetectorRef) {
    super();
    this.recent = store.get(this.LOCAL_STORE) || [];
  }

  ngOnInit() {
    this.control.valueChanges
      .pipe(debounceTime(250), map(val => this.filter(val)))
      .subscribe(vals => {
        this.filteredOptions = vals;
        this._changeDetector.markForCheck();
      });
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

    this._changeDetector.markForCheck();
  }

  public onChange(value) {
    const selected = value.option.value;
    if (this.find(selected)) {
      this.value = selected;
    } else {
      this.value = undefined;
    }

    this._onChange(this.value);
    this.filteredOptions = [];
    if (!this.recent.includes(selected) && selected) {
      this.recent.push(selected);
      if (this.recent.length > 5) this.recent.shift();
      this.recent = this.recent.sort();
      store.set(this.LOCAL_STORE, this.recent);
    }
    this._changeDetector.markForCheck();
  }

  public onBlur(event: any) {
    clearInterval(this.clearInterval);
    this.clearInterval = setInterval(function() {
      if (!this.auto.isOpen) {
        clearInterval(this.clearInterval);

        this.filteredOptions = [];
        this._changeDetector.markForCheck();

        this.onChange({ option: { value: this.search.nativeElement.value } });
      }
    }.bind(this), 500);
  }

  public onFocus(value: string): void {
    this.filteredOptions = this.filter(value || '');
    this._changeDetector.markForCheck();
  }

  public recentSelect(value: string): void {
    this.control.patchValue(value);
    this.onChange({
      option: {
        value
      }
    });
  }
}
