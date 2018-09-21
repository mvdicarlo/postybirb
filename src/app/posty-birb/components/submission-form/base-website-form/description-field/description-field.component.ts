import { Component, OnInit, OnDestroy, AfterViewInit, forwardRef, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormBuilder, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';
import { DescriptionModel } from '../information.interface';
import { timer, Observable, Subscription } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { NotifyService } from '../../../../../commons/services/notify/notify.service';
import { BbCodeParse } from '../../../../../commons/helpers/bbcode-parse';

@Component({
  selector: 'description-field',
  templateUrl: './description-field.component.html',
  styleUrls: ['./description-field.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DescriptionFieldComponent),
      multi: true,
    }
  ]
})
export class DescriptionFieldComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() defaultDescription: Observable<DescriptionModel>;
  @Input() allowOverwrite: boolean = true;
  @Input() allowEditorChange: boolean = true;
  @Input() exposeEditorChange: boolean = false;
  @Input() maxLength: number = 0;
  @Input() showHelp: boolean = true;

  public form: FormGroup;
  public ckConfig: any;
  public readOnly: boolean = true;
  public exceededNotification: boolean = false;
  private defaultSubscription: Subscription = Subscription.EMPTY;
  private changesSubscription: Subscription = Subscription.EMPTY;

  constructor(private fb: FormBuilder, private _changeDetector: ChangeDetectorRef, private notify: NotifyService) {
    super();

    this.ckConfig = {
      height: 225,
      toolbar: [
        { name: 'Actions', items: ['NewPage', 'Undo', 'Redo'] },
        { name: 'Basic', items: ['Bold', 'Italic', 'Underline', 'Strike', '-', 'HorizontalRule', '-', 'RemoveFormat'] },
        { name: 'Justify', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
        { name: 'Formatting', items: ['TextColor', 'FontSize'] },
        { name: 'Link', items: ['Link', 'Unlink'] }
      ],
      removePlugins: 'magicline,elementspath,dialogadvtab,div,filebrowser,flash,format,forms,iframe,liststyle,pagebreak,showborders,stylescombo,templates',
      extraPlugins: 'panelbutton,bbcode,colorbutton,basicstyles,newpage,justify,font,horizontalrule',
      disableObjectResizing: true,
      htmlEncodeOutput: true,
      removeButtons: '',
      scayt_autoStartup: true,
      forcePasteAsPlainText: true
    };
  }

  ngOnInit() {
    this.maxLength = Number(this.maxLength);

    this.form = this.fb.group({
      description: [],
      useDefault: [this.allowOverwrite],
      simple: [false]
    });

    this.changesSubscription = this.form.valueChanges.pipe(debounce(() => timer(100))).subscribe(values => {
      values.description = this.generateDescription(values.description, values.useDefault);
      this.onChange(values);
      this._changeDetector.detectChanges();
    });
  }

  ngAfterViewInit() {
    if (this.defaultDescription) {
      this.defaultSubscription = this.defaultDescription
        .pipe(debounce(() => timer(100)))
        .subscribe((defDescription) => {
          if (this.form && this.form.controls.useDefault.value) {
            this.form.controls.description.setValue(defDescription ? defDescription.description : '', { emitEvent: false });
            this.updateEstimatedCharacterCount().subscribe(() => {
              // Do nothing right now.
            });
          }
        });
    }
  }

  ngOnDestroy() {
    this.defaultSubscription.unsubscribe();
    this.changesSubscription.unsubscribe();
  }

  onChange(values: any) {
    this.onChangedCallback(values);
  }

  private generateDescription(description: string, useDefault: boolean): string {

    if (!this.allowOverwrite) { //when useDefault is disallowed
      description = this.defaultDescription ? '' : description;
    }

    return useDefault ? '' : description;
  }

  public writeValue(obj: DescriptionModel) {
    if (obj) {
      this.form.setValue(JSON.parse(JSON.stringify(obj)), { emitEvent: false });
    } else {
      this.form.reset({
        useDefault: this.allowOverwrite,
        description: '',
        simple: false
      }, { emitEvent: false });
    }

    this._changeDetector.markForCheck();
  }

  public updateEstimatedCharacterCount(): Observable<number> {
    return new Observable<number>(observer => {
      let description = this.form.value.description;
      if (description) {
        const totalEstimate: number = BbCodeParse.guessBBCodeCount(this.form.value.description);

        if (this.maxLength > 0) {
          if (totalEstimate > this.maxLength && !this.exceededNotification) {
            this.exceededNotification = true;
            this.notify.translateNotification('Description length exceeded', { length: this.maxLength }).subscribe(msg => {
              this.notify.getNotify().warning(msg);
            });
          } else if (totalEstimate <= this.maxLength) {
            this.exceededNotification = false;
          }
        }

        observer.next(totalEstimate);
        observer.complete();
      } else {
        observer.next(0);
        observer.complete();
      }
    });
  }
}
