import { Injectable } from '@angular/core';
import { BaseTemplateService, BaseSimpleTemplate } from './base-template.service';

export interface DescriptionTemplate extends BaseSimpleTemplate {
  description: string;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class DescriptionTemplatesService extends BaseTemplateService<DescriptionTemplate> {
  private templates: DescriptionTemplate[] = [];

  constructor() {
    super(templateDB);
    this.templates = super.getTemplates();
  }

  public getTemplates(): DescriptionTemplate[] {
    return this.templates;
  }

  public removeTemplate(id: string): void {
    const index = this.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.templates.splice(index, 1);
    }
    super.removeTemplate(id);
  }

  public saveTemplate(id: string, data: DescriptionTemplate): void {
    super.saveTemplate(id, data);
    const templates = super.getTemplates();
    for (let i = 0; i < templates.length; i++) {
      this.templates[i] = templates[i];
    }
  }
}
