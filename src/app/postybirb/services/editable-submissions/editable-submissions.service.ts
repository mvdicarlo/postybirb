import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { SubmissionArchive } from '../../models/postybirb-submission-model';
import { debounceTime } from 'rxjs/operators';
import { SubmissionEditingFormComponent } from '../../components/submission-editing-form/submission-editing-form.component';
import { SidebarNavigatorComponent } from '../../components/postybirb-primary-form/sidebar-navigator/sidebar-navigator.component';

export interface Tracker {
  filtered: boolean;
  editingForm: SubmissionEditingFormComponent,
  navigator: SidebarNavigatorComponent,
  archive: SubmissionArchive,
  passing?: boolean;
}

@Injectable()
export class EditableSubmissionsService {
  private editingArchives: Map<string,Tracker>;
  private lastFilter: string = '';

  constructor(private _store: Store) {
    this.editingArchives = new Map();

    _store.select(state => state.postybirb.editing).pipe(debounceTime(50)).subscribe((editing: SubmissionArchive[]) => {
      for (let i = 0; i < editing.length; i++) {
          const archive: SubmissionArchive = editing[i];
          if (this.editingArchives.has(archive.meta.id)) {
            const tracker: Tracker = this.editingArchives.get(archive.meta.id);
            tracker.archive = archive;
            this.editingArchives.set(archive.meta.id, tracker);
          } else {
            this.editingArchives.set(archive.meta.id, {
              filtered: false,
              editingForm: null,
              navigator: null,
              archive
            });
          }
      }

      // clean up old keys
      const currentKeys: string[] = editing.map(s => s.meta.id);
      const idKeys: string[] = [];
      this.editingArchives.forEach((value, key) => {
        idKeys.push(key);
      });

      for (let i = 0; i < idKeys.length; i++) {
          if (!currentKeys.includes(idKeys[i])) {
            this.editingArchives.delete(idKeys[i]);
          }
      }
    });
  }

  private createIfNecessary(id: string): void {
    if (!this.editingArchives.has(id)) {
      this.editingArchives.set(id, {
        filtered: false,
        navigator: null,
        editingForm: null,
        archive: null
      });
    }
  }

  public addEditingForm(id: string, form: SubmissionEditingFormComponent): void {
    this.createIfNecessary(id);
    const tracker: Tracker = this.editingArchives.get(id);
    tracker.editingForm = form;
    if (form && this.lastFilter.length) {
      form.hidden = this.lastFilter;
      tracker.filtered = form.hidden;
    } else {
      tracker.filtered = false;
    }

    this.editingArchives.set(id, tracker);
  }

  public removeEditingForm(id: string): void {
    this.addEditingForm(id, null);
  }

  public addNavigator(id: string, navigator: SidebarNavigatorComponent): void {
    this.createIfNecessary(id);
    const tracker: Tracker = this.editingArchives.get(id);
    tracker.navigator = navigator;
    this.editingArchives.set(id, tracker);
  }

  public removeNavigator(id: string): void {
      this.addNavigator(id, null);
  }

  public filter(filter: string): void {
    this.lastFilter = filter || '';

    this.editingArchives.forEach((value: Tracker, key: string) => {
      if (value.editingForm) {
        value.editingForm.hidden = filter;
        value.filtered = value.editingForm.hidden;

        if (value.navigator) {
          value.navigator.hide = value.filtered;
        }
      }
    });
  }

  public applyTemplate(id: string, template: any): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.templateSelected(template);
    }
  }

  public highlightForm(id: string): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.toggleHighlight();
    }
  }

  public deleteForm(id: string): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.deleteSubmission();
    }
  }

  public saveForm(id: string): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.save();
    }
  }

  public scrollToForm(id: string): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.title.nativeElement.focus();
    }
  }

  public getForm(id: string): SubmissionEditingFormComponent {
    const tracker: Tracker = this.editingArchives.get(id);
    return tracker ? tracker.editingForm : null;
  }

  public isFiltered(id: string): boolean {
    return (this.editingArchives.get(id).filtered || false);
  }

  public isPassing(id: string): boolean {
    const tracker: Tracker = this.editingArchives.get(id);
    return tracker.passing || false;
  }

  public setPassing(id: string, passing: boolean): void {
    const tracker: Tracker = this.editingArchives.get(id);
    tracker.passing = passing;
    this.editingArchives.set(id, tracker);
    if (tracker.navigator) {
      tracker.navigator.passing = passing;
    }
  }
}
