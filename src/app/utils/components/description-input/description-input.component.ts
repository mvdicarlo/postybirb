import { Component, OnInit, Input, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseValueAccessor } from 'src/app/utils/components/base-value-accessor/base-value-accessor';
import { tap } from 'rxjs/operators';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { MatDialog } from '@angular/material';
import { SaveTemplateDialog } from './save-template-dialog/save-template-dialog.component';
import { UsernameParser } from '../../helpers/description-parsers/username.parser';
import { WebsiteRegistryEntry, WebsiteRegistry } from 'src/app/websites/registries/website.registry';
import { PlaintextParser } from '../../helpers/description-parsers/plaintext.parser';
import { copyObject } from '../../helpers/copy.helper';
import { DescriptionTemplatesService } from '../../services/description-templates.service';
import { HTMLFormatParser } from '../../helpers/description-parsers/html.parser';
import { BBCodeParser } from '../../helpers/description-parsers/bbcode.parser';

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
export class DescriptionInput extends BaseValueAccessor implements OnInit, AfterViewInit, OnDestroy {
  @Input() canOverwrite: boolean = true;
  @Input() defaultDescriptionProvider: Observable<DescriptionData>;
  private templateSubscriber: Subscription = Subscription.EMPTY;
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
    paste_retain_style_properties: 'color',
    invalid_elements: 'img,audio,video',
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

  public characterCount: number = 0;
  private usernameCodes: { code: string, url: string }[] = [];

  constructor(private _descriptionTemplates: DescriptionTemplatesService, private dialog: MatDialog, private _changeDetector: ChangeDetectorRef) {
    super({
      overwrite: false,
      description: ''
    });

    this.tinyMCESettings.templates = _descriptionTemplates.getTemplates();

    this._internalProvider = new BehaviorSubject(this.value);
    this.changes = this._internalProvider.asObservable();

    const registries: WebsiteRegistryEntry = WebsiteRegistry.getRegistered();
    Object.keys(registries).forEach(key => {
      const registry = registries[key];
      if (registry.websiteConfig.parsers.usernameShortcut) {
        this.usernameCodes.push({
          code: registry.websiteConfig.parsers.usernameShortcut.code,
          url: registry.websiteConfig.parsers.usernameShortcut.url
        });
      }
    });
  }

  ngOnInit() {
    this.templateSubscriber = this._descriptionTemplates.templateUpdates.subscribe(templates => this.tinyMCESettings.templates = templates);

    if (this.defaultDescriptionProvider) {
      this.providerSubscriber = this.defaultDescriptionProvider
        .subscribe(defaultDescriptionData => {
          this.providerData = defaultDescriptionData || { overwrite: false, description: '' };
          if (!this.value.overwrite) {
            this.tinymce.setValue(this.providerData.description, { emitEvent: false });
          }
        });
    }

    this.tinymce.valueChanges
      .pipe(tap(val => this._updateCount(val)))
      .subscribe(description => {
        this.value.description = description;
        this.onChange();
      });

    this.overwriteControl.valueChanges.subscribe(overwrite => {
      this.value.overwrite = overwrite;
      this.onChange();
    });
  }

  ngAfterViewInit() {
    this._updateCount(this.tinymce.value);
  }

  ngOnDestroy() {
    this.templateSubscriber.unsubscribe();
    this.providerSubscriber.unsubscribe();
    this._internalProvider.complete();
  }

  writeValue(data: DescriptionData) {
    data = copyObject(data);
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
    console.log(PlaintextParser.parse(HTMLFormatParser.parse(this.value.description)))
    console.log(BBCodeParser.parse(HTMLFormatParser.parse(this.value.description)))
    if (this.value.overwrite || !this.canOverwrite) {
      this._onChange(copyObject(this.value));
    } else {
      this._onChange({ overwrite: false, description: '' });
    }

    this._internalProvider.next(this.value);
  }

  private _updateCount(description: string): void {
    if (!description) this.characterCount = 0;
    else {
      this.usernameCodes.forEach(obj => {
        description = UsernameParser.parse(description, obj.code, obj.url);
      });

      description = PlaintextParser.parse(description);
      this.characterCount = description.length;
    }

    this._changeDetector.markForCheck();
  }

  public saveDescriptionTemplate(): void {
    this.dialog.open(SaveTemplateDialog, {
      data: this.tinymce.value
    })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this._descriptionTemplates.saveTemplate(null, { id: null, title: result.title, description: result.description, content: result.content });
          this.tinyMCESettings.templates = this._descriptionTemplates.getTemplates();
        }
      });
  }

}
