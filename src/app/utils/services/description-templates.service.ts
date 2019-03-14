import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DescriptionTemplatesService {
  private readonly FIELD: string = 'TEMPLATES';
  private db: any;

  constructor() {
    this.db = descriptionTemplateDB;
    this.db.defaults({ [this.FIELD]: [] }).write();
  }

  public saveTemplate(title: string, description: string, content: string): any {
    if (this.db.get(this.FIELD).find({ title }).value()) {
      this.db.get(this.FIELD)
      .find({ title })
      .assign({ description, content })
      .write();
    } else {
      this.db.get(this.FIELD)
      .push({
        title,
        description,
        content
      }).write();
    }

    return {
      title, description, content
    }
  }

  public getTemplates(): any[] {
    return this.db.get(this.FIELD).sortBy('title').value() || [];
  }
}
