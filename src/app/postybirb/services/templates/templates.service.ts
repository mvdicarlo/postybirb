import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { BehaviorSubject, Observable } from 'rxjs';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { CreateTemplateDialogComponent } from '../../components/dialog/create-template-dialog/create-template-dialog.component';

export interface Template {
  template: SubmissionArchive;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {
  private readonly STORE: string = 'posty-birb-templates';
  private templateSubject: BehaviorSubject<Template[]>;
  private templates: Template[] = [];

  constructor(private dialog: MatDialog) {
    this.templates = db.get(this.STORE).value() || [];
    this.sort();

    for (let i = 0; i < this.templates.length; i++) {
      this.templates[i].template = this.convertOldArchive(this.templates[i].template);
    }

    this.templateSubject = new BehaviorSubject<Template[]>(this.templates);
  }

  public asObserver(): Observable<Template[]> {
    return this.templateSubject.asObservable();
  }

  public getTemplates(): Template[] {
    return JSON.parse(JSON.stringify(this.templates));
  }

  public renameTemplate(oldName: string, newName: string): void {
    const index = this.findTemplateIndex(oldName);
    if (index !== -1) {
      this.templates[index].name = newName;
      this.sort();
      this.saveTemplates();
      this.update();
    }
  }

  public addTemplate(name: string, template: SubmissionArchive): void {
    const index = this.findTemplateIndex(name);

    const newTemplate: Template = {
      name,
      template
    };

    if (index !== -1) {
      this.templates[index] = newTemplate;
    } else {
      this.templates.push(newTemplate);
    }

    this.sort();
    this.saveTemplates();
    this.update()
  }

  public deleteTemplate(name: string): void {
    const index = this.findTemplateIndex(name);

    if (index !== -1) {
      this.templates.splice(index, 1);
    }

    this.sort();
    this.saveTemplates();
    this.update();
  }

  public deleteAll(): void {
    this.templates = [];
    this.saveTemplates();
    this.update();
  }

  public nameExists(name: string): boolean {
    return this.findTemplateIndex(name) !== -1;
  }

  public saveTemplate(templateModel: PostyBirbSubmissionModel): void {
    let dialogRef: MatDialogRef<CreateTemplateDialogComponent>;
    dialogRef = this.dialog.open(CreateTemplateDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const template = templateModel.asSubmissionTemplate();
        template.websites = template.meta.unpostedWebsites;
        this.addTemplate(result, template);
      }
    });
  }

  private update(): void {
    this.templateSubject.next(JSON.parse(JSON.stringify(this.templates)));
  }

  private saveTemplates(): void {
    db.set(this.STORE, this.templates).write();
  }

  private findTemplateIndex(name: string): number {
    for (let i = 0; i < this.templates.length; i++) {
      if (name === this.templates[i].name) return i;
    }

    return -1;
  }

  private sort(): void {
    this.templates.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
  }

  private convertOldArchive(old: any): SubmissionArchive {
    if (old.defaultFields) {
      const newArchive: any = {
        meta: old.meta,
        websites: old.defaultFields.selectedWebsites,
        descriptionInfo: {},
        tagInfo: {},
        optionInfo: {}
      };

      const descriptions = {
        default: old.defaultFields.defaultDescription,
      };

      const tags = {
        default: old.defaultFields.defaultTags
      };

      const options = {};

      const websiteData = old.websiteFields;
      const keys = Object.keys(websiteData);
      for (let i = 0; i < keys.length; i++) {
        const website = keys[i];
        const wData = websiteData[website];
        options[website] = wData.options;
        descriptions[website] = wData.description;
        tags[website] = wData.tags;
      }

      newArchive.optionInfo = options;
      newArchive.descriptionInfo = descriptions;
      newArchive.tagInfo = tags;

      return newArchive;
    } else {
      return old;
    }
  }
}
