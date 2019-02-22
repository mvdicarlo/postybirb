import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseValueAccessor } from 'src/app/utils/components/base-value-accessor/base-value-accessor';
import { debounceTime } from 'rxjs/operators';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { DescriptionTemplatesService } from '../../services/description-templates.service';
import { MatDialog } from '@angular/material';
import { SaveTemplateDialog } from './save-template-dialog/save-template-dialog.component';

export interface DescriptionData {
  overwrite: boolean;
  description: string;
}

@Component({
  selector: 'description-input',
  templateUrl: './description-input.component.html',
  styleUrls: ['./description-input.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: DescriptionInput,
    multi: true
  }],
})
export class DescriptionInput extends BaseValueAccessor implements OnInit, OnDestroy {
  @Input() canOverwrite: boolean = true;
  @Input() defaultDescriptionProvider: Observable<DescriptionData>;
  private providerSubscriber: Subscription = Subscription.EMPTY;
  private providerData: DescriptionData;

  private _internalProvider: BehaviorSubject<DescriptionData>;
  public changes: Observable<DescriptionData>;

  public overwriteControl: FormControl = new FormControl(false);
  public tinymce: FormControl = new FormControl('');
  public tinyMCESettings: any = {
    skin_url: './vendors/tinymce/skins/lightgray',
    suffix: '.min',
    inline: false,
    statusbar: false,
    paste_data_images: false,
    browser_spellcheck: false,
    entity_encoding: 'raw',
    block_formats: 'Paragraph=p;Header 1=h1;Header 2=h2;Header 3=h3;Header 4=h4;Header 5=h5;Header 6=h6',
    content_style: 'p {margin: 0}',
    height: 200,
    plugins: 'autoresize autolink link preview paste hr textcolor template help code',
    menu: {},
    toolbar: 'newdocument undo redo | formatselect removeformat | link unlink hr | bold italic underline strikethrough forecolor | alignleft aligncenter alignright | code template help',
    templates: [],
    formats: {
      underline: { inline: 'u', exact: true },
      strikethrough: { inline: 's', exact: true },
    }
  }

  constructor(private _descriptionTemplates: DescriptionTemplatesService, private dialog: MatDialog) {
    super({
      overwrite: false,
      description: ''
    });

    this.tinyMCESettings.templates = _descriptionTemplates.getTemplates();

    this._internalProvider = new BehaviorSubject(this.value);
    this.changes = this._internalProvider.asObservable();
  }

  ngOnInit() {
    if (this.defaultDescriptionProvider) {
      this.providerSubscriber = this.defaultDescriptionProvider
        .subscribe(defaultDescriptionData => {
          this.providerData = defaultDescriptionData || { overwrite: false, description: '' };
          if (!this.value.overwrite) {
            this.tinymce.setValue(this.providerData.description, { emitEvent: false });
          }
        });
    }

    this.tinymce.valueChanges.pipe(debounceTime(250))
      .subscribe(description => {
        this.value.description = description;
        this.onChange();
      });

    this.overwriteControl.valueChanges.subscribe(overwrite => {
      this.value.overwrite = overwrite;
      this.onChange();
    });
  }

  ngOnDestroy() {
    this.providerSubscriber.unsubscribe();
    this._internalProvider.complete();
  }

  writeValue(data: DescriptionData) {
    if (data && JSON.stringify(this.value) != JSON.stringify(data)) {
      this.value = data;

      this.tinymce.setValue(data.description, { emitEvent: false });
      this.overwriteControl.setValue(data.overwrite, { emitEvent: false });
    } else if (!data) {
      this.value = { overwrite: false, description: '' };
      this.tinymce.setValue('', { emitEvent: false });
      this.overwriteControl.setValue(false, { emitEvent: false });
    }

    this._internalProvider.next(this.value);
  }

  onChange() {
    if (this.value.overwrite || !this.canOverwrite) {
      this._onChange(this.value);
    } else {
      this._onChange({ overwrite: false, description: '' });
    }

    this._internalProvider.next(this.value);
  }

  public saveDescriptionTemplate(): void {
    this.dialog.open(SaveTemplateDialog, {
      data: this.tinymce.value
    })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this._descriptionTemplates.saveTemplate(result.title, result.description, result.content);
          this.tinyMCESettings.templates = this._descriptionTemplates.getTemplates();
        }
      });
  }

}
