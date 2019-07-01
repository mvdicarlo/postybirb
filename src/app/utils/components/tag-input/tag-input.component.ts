import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, Validators } from '@angular/forms';
import { BaseValueAccessor } from 'src/app/utils/components/base-value-accessor/base-value-accessor';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatDialog } from '@angular/material';
import { copyObject } from '../../helpers/copy.helper';
import { TagGroupManagementDialog } from './tag-group-management-dialog/tag-group-management-dialog.component';
import { TagTemplatesService, TagTemplate } from '../../services/tag-templates.service';
import { SnotifyService } from 'ng-snotify';
import { TranslateService } from '@ngx-translate/core';

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
    'class': 'd-block'
  }
})
export class TagInput extends BaseValueAccessor implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() canExtend: boolean = true;
  @Input() canManageGroups: boolean = true;
  @Input() defaultTagProvider: Observable<TagData>;
  private templateSubscriber: Subscription = Subscription.EMPTY;
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
  public tagGroupTemplates: TagTemplate[] = [];

  constructor(
    private _tagTemplates: TagTemplatesService,
    private dialog: MatDialog,
    private snotify: SnotifyService,
    private translateService: TranslateService,
    private _changeDetector: ChangeDetectorRef
  ) {
    super({
      tags: [],
      extend: true
    });

    this._internalProvider = new BehaviorSubject(this.value);
    this.changes = this._internalProvider.asObservable();
  }

  ngOnInit() {
    this.tagGroupTemplates = this._tagTemplates.getTemplates();
    this.templateSubscriber = this._tagTemplates.templateUpdates.subscribe(templates => {
      this.tagGroupTemplates = templates;
      this._changeDetector.markForCheck();
    });

    if (!this.config.maxTags) this.config.maxTags = 200;
    if (!this.config.minTagLength) this.config.minTagLength = 1;

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
    this.templateSubscriber.unsubscribe();
    this.providerSubscriber.unsubscribe();
    this._internalProvider.complete();
  }

  writeValue(data: TagData) {
    data = copyObject(data);

    if (data && JSON.stringify(this.value) != JSON.stringify(data)) {
      this.value = data;

      this.tagControl.setValue(data.tags, { emitEvent: false });
      this.extendControl.setValue(data.extend, { emitEvent: false });
      this._removeDuplicates();
      this._updateTagCount();
      this._internalProvider.next(this.value);
    } else if (!data) {
      this.value = { tags: [], extend: true };
      this.extendControl.setValue(true, { emitEvent: false });
      this.tagControl.setValue([], { emitEvent: false });
      this._updateTagCount();
      this.onChange();
    }
  }

  onChange() {
    this._onChange(copyObject(this.value));
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

  public addOrManageTagGroups(): void {
    this.dialog.open(TagGroupManagementDialog, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
    });
  }

  public applyGroup(template: TagTemplate): void {
    template.tags.forEach(tag => this._addTag(tag, false));
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

  private _addTag(addTag: string, doNotify: boolean = true): void {
    let tag = addTag
      .trim()
      .replace(/("|;|\\|\[|\]|\{|\}|\||\!|\@|\$|\%|\^|\&|\*|\+|\=|\<|\>||\?|`|~)/g, '');

    if (tag.length >= this.config.minTagLength) {
      const allTags = this.getTags()
      if (!allTags.includes(tag)) {
        if (this.config.maxTags && allTags.length >= this.config.maxTags) {
          return;
        }

        this.tagControl.patchValue([...this.value.tags, tag]);
      } else if (doNotify) {
        this.snotify.warning(this.translateService.instant(`Ignored tag`, { tag }), { timeout: 2000 });
      }
    }
  }


  public captureIllegalKeys(event: KeyboardEvent): void {
    const illegalKeys: string = '";|\\[]{}=*&^%$!`~<>?+';
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

  public isPassing(): boolean {
    if (this.config && this.config.minTags > 0) {
      return this.getTags().length >= this.config.minTags;
    }

    return true;
  }

}
