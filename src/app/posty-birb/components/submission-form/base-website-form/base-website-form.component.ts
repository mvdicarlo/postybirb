import { Component, DoCheck, OnChanges, OnDestroy, SimpleChanges, Input, Injector, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SupportedWebsites } from '../../../../commons/enums/supported-websites';
import { Information, DescriptionModel, TagModel } from './information.interface';
import { MatTab, MatTabGroup } from '@angular/material';
import { Subscription, Observable } from 'rxjs';
import { EditFormDialogComponent } from '../edit-form-dialog/edit-form-dialog.component';

@Component({
  selector: 'base-website-form',
  template: `<div></div>`,
})
export class BaseWebsiteFormComponent implements OnChanges, OnDestroy, DoCheck {
  @Input()
  get defaultTags(): TagModel { return this._defaultTags }
  set defaultTags(model: TagModel) {
    if (model) {
      this._defaultTags = model;
    } else {
      this._defaultTags = { tags: [], overwrite: false };
    }
  }
  private _defaultTags: TagModel = { tags: [], overwrite: false }

  @Input() defaultDescription: Observable<DescriptionModel>;
  @Input() template: any;

  public supportedWebsites = SupportedWebsites;

  public form: FormGroup;
  public optionsForm: FormGroup;
  private _options: object;

  public minimumTags: number = 0;
  public maximumTags: number = 200;
  public website: string;

  private subscription: Subscription = Subscription.EMPTY;
  public isActive: boolean = false;

  private fb: FormBuilder;
  protected _changeDetector: ChangeDetectorRef;
  public matTab: MatTab;
  private editForm: EditFormDialogComponent;

  constructor(injector: Injector) {
    this.fb = injector.get(FormBuilder);
    this._changeDetector = injector.get(ChangeDetectorRef);
    this.matTab = injector.get(MatTab);

    const tabGroup: MatTabGroup = injector.get(MatTabGroup);
    this.subscription = tabGroup.selectedTabChange.subscribe((event) => {
      this._changeDetector.markForCheck();
    });

    this.form = this.fb.group({
      tags: [],
      description: []
    });
  }

  ngDoCheck() {
    if (this.matTab.position === 0 && !this.isActive) {
      this._changeDetector.markForCheck();
    }

    this.isActive = this.matTab.position === 0;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.defaultDescription) {
        this.defaultDescription = changes.defaultDescription.currentValue;
      }

      if (changes.defaultTags) {
        this.defaultTags = changes.defaultTags.currentValue;
      }

      if (changes.template) {
        this.template = changes.template.currentValue;
        if (this.template) {
          this.writeValue(this.template.getWebsiteFieldFor(this.website))
        }
      }
    }
  }

  public getValues(): Information {
    return {
      tags: this.form.value.tags,
      description: this.form.value.description,
      options: this.optionsForm.value,
    };
  }

  public isValid(): boolean {
    if (this.form.invalid || this.optionsForm.invalid) return false;

    let valid = true;
    const values = this.form.value;

    if (this.minimumTags > 0) {
      if (values.tags) {
        const { overwrite, tags } = values.tags;

        if (overwrite && tags >= this.minimumTags) {
          valid = true;
        } else {
          valid = (tags.length + this.defaultTags.tags.length) >= this.minimumTags;
        }
      } else {
        return false;
      }
    }

    return valid;
  }

  public isPristine(): boolean {
    return this.form.pristine && this.optionsForm.pristine;
  }

  public clear(): void {
    this.form.reset(undefined, { emitEvent: false });
    this.optionsForm.reset(this._options, { emitEvent: false });
  }

  protected setOptionsForm(options: object): void {
    this.optionsForm = this.fb.group(options);
    this._options = this.optionsForm.value;
  }

  protected requireValidTags(minimum: number = 0, maximum: number = 200) {
    this.minimumTags = minimum;
    this.maximumTags = maximum;
  }


  public writeValue(model: any) {
    if (model) {
      if (!this.areEqual(model.description, this.form.value.description)) this.form.controls.description.patchValue(model.description, { emitEvent: false });
      if (!this.areEqual(model.tags, this.form.value.tags)) this.form.controls.tags.patchValue(model.tags, { emitEvent: false });
      if (!this.areEqual(model.options, this.optionsForm.value)) this.optionsForm.patchValue(model.options, { emitEvent: false });
    } else {
      this.clear();
    }
  }

  protected areEqual(obj1, obj2): boolean {
    return JSON.stringify(obj1) == JSON.stringify(obj2);
  }

}
