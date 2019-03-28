import { Component, OnInit, ChangeDetectionStrategy, forwardRef, Injector, AfterViewInit, OnDestroy } from '@angular/core';
import { Submission } from 'src/app/database/models/submission.model';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { SubmissionType, ISubmission } from 'src/app/database/tables/submission.table';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';
import { BaseSubmissionForm } from '../base-submission-form/base-submission-form.component';
import { getUnfilteredWebsites } from 'src/app/login/helpers/displayable-websites.helper';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { TemplateManagementDialog } from 'src/app/templates/components/template-management-dialog/template-management-dialog.component';
import { TemplateSelectDialog } from 'src/app/templates/components/template-select-dialog/template-select-dialog.component';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

@Component({
  selector: 'template-form',
  templateUrl: './template-form.component.html',
  styleUrls: ['./template-form.component.css'],
  providers: [{ provide: BaseSubmissionForm, useExisting: forwardRef(() => TemplateForm) }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateForm extends BaseSubmissionForm implements OnInit, AfterViewInit, OnDestroy {
  protected readonly LOCAL_STORE: string = 'template-form-store';
  private loadedTemplateName: string;

  constructor(
    injector: Injector
  ) {
    super(injector);
  }

  ngOnInit() {
    this.loading = true;
    this.availableWebsites = getUnfilteredWebsites() || {};
    this.submission = new Submission(<any>{ id: -1 }); // Create stub submission
    this.submission.formData = store.get(this.LOCAL_STORE) || {};
    this._initializeFormDataForm();

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  protected _formUpdated(changes: any): void {
    store.set(this.LOCAL_STORE, changes);
  }

  public clear(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Clear'
      }
    }).afterClosed()
      .subscribe(doClear => {
        if (doClear) {
          this.formDataForm.reset();
          this.resetSubject.next();
          store.remove(this.LOCAL_STORE);
          this.loadedTemplateName = null;
        }
      });
  }

  public loadTemplate(): void {
    this.dialog.open(TemplateSelectDialog)
      .afterClosed()
      .subscribe(template => {
        if (template) {
          this.loadedTemplateName = template.name;
          this.formDataForm.patchValue(template.data);
        }
      });
  }

  public openCopySubmission(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Copy',
        type: SubmissionType.SUBMISSION
      }
    }).afterClosed()
      .subscribe((toCopy: ISubmission) => {
        if (toCopy) {
          this._copySubmission(toCopy);
        }
      });
  }

  public openManageTemplates(): void {
    this.dialog.open(TemplateManagementDialog, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
    });
  }

  public saveTemplate(): void {
    this.dialog.open(InputDialog, {
      data: {
        title: 'Save',
        minLength: 1,
        maxLength: 50,
        startingValue: this.loadedTemplateName || null
      }
    }).afterClosed()
      .subscribe(templateName => {
        if (templateName) {
          this.loadedTemplateName = templateName;
          this._templateManager.createTemplate(templateName.trim(), copyObject(this.formDataForm.value));
        }
      });
  }
}
