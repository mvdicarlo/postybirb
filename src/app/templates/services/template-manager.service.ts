/**
 * This service keeps tracks of and manages templates in the application.
 */

import { Injectable } from '@angular/core';
import * as nanoid from 'nanoid';
import { BehaviorSubject, Observable } from 'rxjs';
import { Template } from '../interfaces/template.interface';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

@Injectable({
  providedIn: 'root'
})
export class TemplateManagerService {
  private readonly TEMPLATE_FIELD: string = 'templates';
  private db: any;

  private subject: BehaviorSubject<Template[]> = new BehaviorSubject([]);
  public readonly templateChanges: Observable<Template[]> = this.subject.asObservable();

  constructor() {
    this.db = templateDB;
    this.db.defaults({ [this.TEMPLATE_FIELD]: [] }).write();
    this._notifyAll();
  }

  /**
   * Notifies all subscribers of template changes
   */
  private _notifyAll(): void {
    this.subject.next(this.db.get(this.TEMPLATE_FIELD).sortBy('name').value() || []);
  }

  /**
   * Updates a template name
   * @param id   Id reference to the template
   * @param name New name for the template
   */
  public renameTemplate(id: string, name: string): void {
    this.db.get(this.TEMPLATE_FIELD)
      .find({ id })
      .assign({ name })
      .write();

    this._notifyAll();
  }

  /**
   * Deletes an existing template
   * @param id Id reference to the template
   */
  public deleteTemplate(id: string): void {
    this.db.get(this.TEMPLATE_FIELD)
      .remove({ id })
      .write();

    this._notifyAll();
  }

  /**
   * Inserts a new Template into the Template DB if it doesn't exist already.
   * If it does exist, it will update the existing template.
   * @param name Name of the template that will be displayed to the user
   * @param data Data to be set into the template
   */
  public createTemplate(name: string, data: any): void {
    const existing: Template = this.db.get(this.TEMPLATE_FIELD).find({ name }).value();
    if (!existing) {
      this.db.get(this.TEMPLATE_FIELD)
        .push({
          id: nanoid(),
          name,
          data: copyObject(data)
        })
        .write();

      this._notifyAll();
    } else {
      this.updateTemplate(name, data);
    }
  }

  /**
   * Updates an existing template's data
   * @param name Name of the template to update
   * @param data Data to be set into the updated template
   */
  public updateTemplate(name: string, data: any): void {
    this.db.get(this.TEMPLATE_FIELD)
      .find({ name })
      .assign({
        data: copyObject(data)
       })
      .write();

    this._notifyAll();
  }

  /**
   * Returns all existing templates sorted by name
   */
  public getTemplates(): Template[] {
    return copyObject(this.db.get(this.TEMPLATE_FIELD).sortBy('name').value() || []);
  }
}
