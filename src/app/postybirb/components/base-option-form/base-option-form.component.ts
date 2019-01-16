import { Component, DoCheck, OnDestroy, Injector, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SupportedWebsites } from '../../../commons/enums/supported-websites';
import { MatTab, MatTabGroup } from '@angular/material';
import { Subscription } from 'rxjs';
import { SubmissionType } from '../../enums/submission-type.enum';
import { Rating } from '../../enums/rating.enum';

@Component({
  selector: 'base-option-form',
  template: `<div></div>`,
})
export class BaseOptionForm implements DoCheck, OnDestroy {
  public supportedWebsites = SupportedWebsites;
  public submissionType: SubmissionType = SubmissionType.ARTWORK;
  public rating: Rating = Rating.GENERAL;
  public website: string;

  public optionsForm: FormGroup;
  private _options: object;

  private subscription: Subscription = Subscription.EMPTY;
  public isActive: boolean = false;

  private fb: FormBuilder;
  protected _changeDetector: ChangeDetectorRef;
  public matTab: MatTab;

  constructor(injector: Injector) {
    this.fb = injector.get(FormBuilder);
    this._changeDetector = injector.get(ChangeDetectorRef);
    this.matTab = injector.get(MatTab);

    const tabGroup: MatTabGroup = injector.get(MatTabGroup);
    this.subscription = tabGroup.selectedTabChange.subscribe((event) => {
      this._changeDetector.markForCheck();
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

  public clear(): void {
    this.optionsForm.reset(this._options);
  }

  protected setOptionsForm(options: object): void {
    this.optionsForm = this.fb.group(options);
    this._options = this.optionsForm.value;
  }

  protected areEqual(obj1, obj2): boolean {
    return JSON.stringify(obj1) == JSON.stringify(obj2);
  }

}
