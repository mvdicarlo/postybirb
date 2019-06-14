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

  constructor() {
    super(templateDB);
  }
}
