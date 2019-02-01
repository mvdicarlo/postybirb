import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, Validators } from '@angular/forms';
import { BaseValueAccessor } from 'src/app/utils/components/base-value-accessor/base-value-accessor';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material';

export interface TagData {
  tags: string[];
  extend: boolean; // whether or not to extend or overwrite default
}

export interface TagConfig {
  maxTagLength?: number;
  minTagLength?: number;
  minTags?: number;
  maxTags?: number;
  maxStringLength?: number; // the max total characters of a concatenated string allowed
}

@Component({
  selector: 'tag-input',
  templateUrl: './tag-input.component.html',
  styleUrls: ['./tag-input.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: TagInput,
    multi: true
  }],
  host: {
    'class': 'd-block bordered'
  }
})
export class TagInput extends BaseValueAccessor implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() canExtend: boolean = true;
  @Input() defaultTagProvider: BehaviorSubject<TagData>;
  private providerSubscriber: Subscription = Subscription.EMPTY;
  private providerData: TagData;

  private _internalProvider: BehaviorSubject<TagData>;
  public changes: Observable<TagData>;

  @Input() config: TagConfig = {
    minTagLength: 1,
    minTags: 0,
    maxTags: 200
  };

  @ViewChild('tagInput') tagInput: ElementRef;

  public separatorKeysCodes = [ENTER, COMMA];
  public tagControl: FormControl = new FormControl([]);
  public extendControl: FormControl = new FormControl(true);
  public tagCount: number = 0;

  constructor() {
    super({
      tags: [],
      extend: true
    });

    this._internalProvider = new BehaviorSubject(this.value);
    this.changes = this._internalProvider.asObservable();
  }

  ngOnInit() {
    if (this.defaultTagProvider) {
      this.providerSubscriber = this.defaultTagProvider
        .subscribe(defaultTagData => {
          this.providerData = defaultTagData || { tags: [], extend: false };
          this._removeDuplicates();
          this._updateTagCount();
        });
    }

    const validators: any[] = [];
    if (this.config.minTags) {
      validators.push(Validators.required);
      validators.push(Validators.minLength(this.config.minTags));
    }

    if (this.config.maxTags) {
      validators.push(Validators.maxLength(this.config.maxTags));
    }

    if (validators.length) {
      this.tagControl.setValidators(validators);
    }

    this.extendControl.valueChanges.subscribe(extend => {
      this.value.extend = extend;
      this._removeDuplicates();
      this._updateTagCount();
      this.onChange();
    });

    this.tagControl.valueChanges.subscribe((tags: string[]) => {
      this.value.tags = tags;
      this._removeDuplicates();
      this._updateTagCount();
      this.onChange();
    });
  }

  ngOnDestroy() {
    this.providerSubscriber.unsubscribe();
    this._internalProvider.complete();
  }

  writeValue(data: TagData) {
    if (data && JSON.stringify(this.value) != JSON.stringify(data)) {
      this.value = data;

      this.tagControl.setValue(data.tags, { emitEvent: false });
      this.extendControl.setValue(data.extend, { emitEvent: false });
      this._removeDuplicates();
      this._updateTagCount();
    } else if (!data) {
      this.value = { tags: [], extend: true };
      this._updateTagCount();
      this.onChange();
    }
  }

  onChange() {
    console.log('Tag Data Update', this.value);
    this._onChange(this.value);
    this._internalProvider.next(this.value);
  }

  private _updateTagCount(): void {
    let total: number = this.value.tags.length;
    if (this.value.extend) {
      if (this.providerData) {
        total += (this.providerData.tags || []).length;
      }
    }

    this.tagCount = total;
  }

  private _removeDuplicates(): void {
    if (this.value.extend) {
      const tags: string[] = [];

      const myTags: string[] = this.value.tags || [];
      const providerTags: string[] = (this.providerData || <any>{}).tags || [];

      for (let i = 0; i < myTags.length; i++) {
        if (!providerTags.includes(myTags[i])) {
          tags.push(myTags[i]);
        }
      }

      const filtered = tags.filter(tag => tag.length >= this.config.minTagLength);
      this.value.tags = filtered;
      this.tagControl.setValue(filtered, { emitEvent: false });
    }
  }

  public getTags(): string[] {
    if (this.value.extend && this.providerData) {
      return [...this.value.tags, ...this.providerData.tags];
    } else {
      return this.value.tags;
    }
  }

  public clearAllTags(): void {
    if (this.value.tags.length) {
      this.tagControl.patchValue([]);
    }
  }

  public removeTag(tag: string): void {
    const tags: string[] = this.value.tags;
    const index: number = tags.indexOf(tag);
    if (index !== -1) {
      tags.splice(index, 1);
      this.tagControl.patchValue(tags);
    }
  }

  public addTag(event: MatChipInputEvent): void {
    const tags = (event.value || '').split(',');
    if (event.input) {
      event.input.value = '';
    }

    tags.forEach(t => this._addTag(t));

  }

  private _addTag(addTag: string): void {
    let tag = addTag
      .trim()
      .replace(/("|;|\\|\[|\]|\{|\}|\||\!|\@|\$|\%|\^|\&|\*|\+|\=|\<|\>|\.|\?|`|~)/g, '');

    if (tag.length >= this.config.minTagLength) {
      const allTags = this.getTags()
      if (!allTags.includes(tag)) {
        if (this.config.maxTags && allTags.length >= this.config.maxTags) {
          return;
        }

        this.tagControl.patchValue([...this.value.tags, tag].sort());
      }
    }
  }


  public captureIllegalKeys(event: KeyboardEvent): void {
    const illegalKeys: string = '";|\\[]{}=*&^%$!`~.<>?+';
    if (illegalKeys.includes(event.key)) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  public copyToClipboard(): void {
    writeToClipboard({
      text: this.value.tags.join(', ')
    });
  }

}
