import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SubmissionArchive } from '../../../commons/models/posty-birb/posty-birb-submission';

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

  constructor() {
    this.templates = db.get(this.STORE).value() || [];
    this.sort();
    this.templateSubject = new BehaviorSubject<Template[]>(this.templates);
  }

  public asObserver(): Observable<Template[]> {
    return this.templateSubject.asObservable();
  }

  public getTemplates(): Template[] {
    return this.templates;
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
    this.templateSubject.next(this.templates);
  }

  public deleteTemplate(name: string): void {
    const index = this.findTemplateIndex(name);

    if (index !== -1) {
      this.templates.splice(index, 1);
    }

    this.sort();
    this.saveTemplates();
    this.templateSubject.next(this.templates);
  }

  public deleteAll(): void {
    this.templates = [];
    this.saveTemplates();
    this.templateSubject.next(this.templates);
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
}
