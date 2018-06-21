import { Component, OnInit, OnChanges, AfterViewInit, SimpleChanges, forwardRef, Input, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';
import { TagModel } from '../information.interface';
import { FieldValidator } from '../../validators/field.validator';

import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material';

import { NotifyService } from '../../../../../commons/services/notify/notify.service';

@Component({
  selector: 'tag-field',
  templateUrl: './tag-field.component.html',
  styleUrls: ['./tag-field.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagFieldComponent),
      multi: true,
    }
  ]
})
export class TagFieldComponent extends BaseControlValueAccessorComponent implements OnInit, AfterViewInit, OnChanges, ControlValueAccessor {
  @Input() minimumTags: number = 0;
  @Input() maximumTags: number = 200;
  @Input() maxLength: number = 0;
  @Input() minimumCharacterLength: number = 3;
  @Input() defaultTags: TagModel;
  @Input() allowOverwrite: boolean = true;

  @ViewChild('tagInput') tagInput: ElementRef;

  public form: FormGroup;
  public separatorKeysCodes = [ENTER, COMMA];

  constructor(private fb: FormBuilder, private notify: NotifyService) {
    super();
  }

  ngOnInit() {
    this.form = this.fb.group({
      overwrite: [false],
      tags: [[], [FieldValidator.minimumTags(this.minimumTags)]]
    });

    this.form.controls.overwrite.valueChanges.subscribe(overwrite => {
      if (!overwrite) {
        this.removeDuplicates();
      }
    });

    this.form.valueChanges.subscribe(() => this.onChange());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.defaultTags) {
        this.defaultTags = changes.defaultTags.currentValue;
        if (this.form && !this.form.value.overwrite) {
          this.removeDuplicates();
        }
      }
    }
  }

  ngAfterViewInit() {
    this.onChange();
  }

  public onChange() {
    const values = this.form.value;

    const ret = this.validateTagCount() ? {
      overwrite: values.overwrite,
      tags: values.tags
    } : null;

    this.onChangedCallback(ret);
  }

  public writeValue(model: TagModel) {
    if (model) {
      this.form.setValue(JSON.parse(JSON.stringify(model)), { emitEvent: false });
    } else {
      this.form.reset({ overwrite: false, tags: [] }, { emitEvent: false });
    }
  }

  public validateTagCount(): boolean {
    let totalTags: string[] = [];

    if (!this.form.value.overwrite) {
      const defaultTags = this.getDefaultTags();
      totalTags = [...defaultTags, ...this.form.value.tags];
    } else {
      totalTags = this.form.value.tags;
    }

    return totalTags.length >= this.minimumTags;
  }

  public calculateTotalTagCharacterLength(): number {
    let totalTags: string[] = [];

    if (!this.form.value.overwrite) {
      const defaultTags = this.getDefaultTags();
      totalTags = [...defaultTags, ...this.form.value.tags];
    } else {
      totalTags = this.form.value.tags;
    }

    return totalTags.join(' ').length;
  }

  public calculateTotalTags(): number {
    const tags = this.form.value.tags;

    if (this.form.value.overwrite) {
      return tags.length;
    } else {
      return tags.length + this.getDefaultTags().length;
    }
  }

  public addTag(event: MatChipInputEvent): void {
    const nonDefaultTags = this.form.value.tags || [];
    const defaultTags = this.form.value.overwrite ? [] : this.getDefaultTags();

    const existingTags = [...nonDefaultTags, ...defaultTags];

    (event.value || '').split(',').forEach(value => {
      value = value.trim();
      if (value.length >= this.minimumCharacterLength && !existingTags.includes(value)) {
        if (existingTags.length < this.maximumTags) {
          nonDefaultTags.push(value);
        }
      } else if (existingTags.includes(value)) {
        this.notify.translateNotification('Duplicate tag ignored', { tag: value }).subscribe(msg => {
          this.notify.getNotify().warning(msg);
        })
      }
    });

    this.form.controls.tags.patchValue(nonDefaultTags);

    if (event.input) {
      event.input.value = '';
    }
  }

  public removeTag(tag: string): void {
    const tags = this.form.value.tags || [];
    const index: number = tags.indexOf(tag)
    if (index !== -1) {
      tags.splice(index, 1);
      this.form.controls.tags.patchValue(tags);
    }
  }

  public clearTags(): void {
    this.tagInput.nativeElement.value = '';
    this.form.controls.tags.patchValue([]);
  }

  private removeDuplicates(): void {
    const nonDefaultTags = this.form.value.tags || [];
    const defaultTags = this.getDefaultTags();

    nonDefaultTags.forEach(tag => {
      const index = defaultTags.indexOf(tag);

      if (index !== -1) {
        nonDefaultTags.splice(index, 1);
      }
    });

    this.form.controls.tags.patchValue(nonDefaultTags);
  }

  private getDefaultTags(): string[] {
    return this.defaultTags ? this.defaultTags.tags : [];
  }

}
