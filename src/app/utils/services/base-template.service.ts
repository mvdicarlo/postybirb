import * as nanoid from 'nanoid';
import { Subject, Observable } from 'rxjs';
import { copyObject } from 'src/app/utils/helpers/copy.helper';

export interface BaseSimpleTemplate {
  id?: string;
  title: string;
}

export class BaseTemplateService<T extends BaseSimpleTemplate> {
  protected readonly FIELD: string = 'TEMPLATES';
  protected db: any;

  private updateSubject: Subject<T[]> = new Subject();
  public readonly templateUpdates: Observable<T[]> = this.updateSubject.asObservable();

  constructor(templateDB: any) {
    this.db = templateDB;
    this.db.defaults({ [this.FIELD]: [] }).write();

    // Only occurs because I worry about legacy templates
    const templates = this.db.get(this.FIELD).value();
    const idCheckedTemplates = templates.map(t => {
      if (!t.id) t.id = nanoid();
      return t
    });

    this.db.set(this.FIELD, idCheckedTemplates || []).write();
  }

  public saveTemplate(id: string, data: T): void {
    if (id && this.db.get(this.FIELD).find({ id }).value()) {
      this.db
        .get(this.FIELD)
        .find({ id })
        .assign(data)
        .write();
    } else {
      delete data.id;
      this.db
        .get(this.FIELD)
        .push(Object.assign({ id: nanoid() }, data))
        .write();
    }

    this._notify();
  }

  public removeTemplate(id: string): void {
    this.db.get(this.FIELD)
      .remove({ id })
      .write();

      this._notify();
  }

  public getTemplates(): T[] {
    return copyObject(this.db.get(this.FIELD).sortBy('title').value() || []);
  }

  private _notify(): void {
    this.updateSubject.next(this.getTemplates());
  }
}
