import { Component, OnInit, OnChanges, SimpleChanges, forwardRef, Input } from '@angular/core';
import { FormGroup, FormBuilder, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseControlValueAccessorComponent } from '../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';
import { DescriptionModel } from '../information.interface';
import { timer } from 'rxjs/observable/timer';
import { debounce } from 'rxjs/operators';

@Component({
  selector: 'description-field',
  templateUrl: './description-field.component.html',
  styleUrls: ['./description-field.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DescriptionFieldComponent),
      multi: true,
    }
  ]
})
export class DescriptionFieldComponent extends BaseControlValueAccessorComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() defaultDescription: DescriptionModel;
  @Input() allowOverwrite: boolean = true;
  @Input() allowEditorChange: boolean = true;
  @Input() exposeEditorChange: boolean = false;
  @Input() showHelp: boolean = true;

  public form: FormGroup;
  public ckConfig: any;
  public estimatedDescriptionCount: number = 0;
  public readOnly: boolean = true;

  constructor(private fb: FormBuilder) {
    super();

    this.ckConfig = {
      height: 225,
      toolbar: [
        { name: 'Actions', items: ['NewPage', 'Undo', 'Redo'] },
        { name: 'Basic', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Blockquote', '-', 'RemoveFormat'] },
        { name: 'Justify', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
        { name: 'Formatting', items: ['TextColor', 'FontSize'] },
        { name: 'Link', items: ['Link', 'Unlink'] }
      ],
      removePlugins: 'magicline,elementspath,dialogadvtab,div,filebrowser,flash,format,forms,horizontalrule,iframe,liststyle,pagebreak,showborders,stylescombo,templates',
      extraPlugins: 'panelbutton,bbcode,colorbutton,basicstyles,newpage,justify,font',
      disableObjectResizing: true,
      htmlEncodeOutput: true,
      removeButtons: '',
      scayt_autoStartup: true
    };
  }

  ngOnInit() {
    this.form = this.fb.group({
      description: [],
      useDefault: [this.allowOverwrite],
      simple: [false]
    });

    this.form.valueChanges.pipe(debounce(() => timer(100))).subscribe(values => {

      values.description = this.generateDescription(values.description, values.useDefault);
      this.updateEstimatedCharacterCount(values.description);
      this.onChange(values);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      if (changes.defaultDescription) {
        this.defaultDescription = changes.defaultDescription.currentValue;

        if (this.form && this.form.controls.useDefault.value) {
          this.form.controls.description.setValue(this.defaultDescription ? this.defaultDescription.description : '', { emitEvent: false });
        }
      }
    }
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
        description: this.defaultDescription ? this.defaultDescription.description : '',
        simple: false
      }, { emitEvent: false });
    }
  }

  private updateEstimatedCharacterCount(description: string): void {
    let estimate: string = description;

    if (description) {
      const bbcodeTags = description.match(/\[.*?(\[\/.*?(\]))/g) || [];
      bbcodeTags.forEach(bbcodeTag => {
        const urlMatch = bbcodeTag.match(/url=.*?(?=\])/) || [];
        if (urlMatch.length > 0) {
          estimate = estimate.replace(bbcodeTag, urlMatch[0].replace('url=', ''));
        } else {
          estimate = estimate.replace(bbcodeTag, bbcodeTag.replace(/\[.*?(\])/g, ''));
        }
      });

      this.estimatedDescriptionCount = estimate.replace(/\[.*?(\])/g, '').length;
    } else {
      this.estimatedDescriptionCount = 0;
    }
  }

}
