import { Injectable } from '@angular/core';
import { BaseTemplateService, BaseSimpleTemplate } from './base-template.service';

export interface TagTemplate extends BaseSimpleTemplate {
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TagTemplatesService extends BaseTemplateService<TagTemplate> {

  constructor() {
    super(tagTemplateDB);
  }
}
