import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Template, TEMPLATE_VERSION } from '../../../interfaces/template.interface';

@Component({
  selector: 'form-template-select',
  templateUrl: './form-template-select.component.html',
  styleUrls: ['./form-template-select.component.css']
})
export class FormTemplateSelectComponent implements OnInit {
  @Output() onSelect: EventEmitter<Template> = new EventEmitter();

  private readonly STORE_NAME: string = 'postybirb-profiles';

  public templates: Template[];
  public control: FormControl = new FormControl();

  ngOnInit() {
    this.refresh();
    this.control.valueChanges.subscribe(value => this.onChange(value));
  }

  private sort(profiles): Template[] {
    const arr = profiles.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      } else {
        return 0;
      }
    });

    return arr;
  }

  public onChange(value: any): void {
    if (value) {
      this.emit(value);
    }
  }

  private emit(template: Template): void {
    this.onSelect.emit(template);
  }

  public reset(): void {
    this.control.reset();
  }

  public refresh(): void {
    this.templates = this.sort(this.load());
  }

  private load(): Template[] {
    const loadedProfiles: Template[] = store.get(this.STORE_NAME) || [];
    return loadedProfiles.filter(profile => {
      if (profile.config && profile.version === TEMPLATE_VERSION) {
        return true;
      }

      return false;
    });
  }

  public addTemplate(name: string, template: any): void {
    let templateUpdated: boolean = false;
    const userTemplates = store.get(this.STORE_NAME) || [];
    for (let i = 0; i < userTemplates.length; i++) {
      const p = userTemplates[i];
      if (p.name === name) {
        userTemplates[i].config = template;
        templateUpdated = true;
        break;
      }
    }

    if (!templateUpdated) {
      userTemplates.push({ name, config: template, version: TEMPLATE_VERSION });
    }

    store.set(this.STORE_NAME, userTemplates);
    this.refresh();
  }

}
