import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { SubmissionArchive } from '../../models/postybirb-submission-model';
import { debounceTime } from 'rxjs/operators';
import { MatDialog } from '@angular/material';
import { BulkUpdateDialogComponent } from '../../components/dialog/bulk-update-dialog/bulk-update-dialog.component';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';

@Injectable()
export class BulkUpdateService {
  private archives: SubmissionArchive[] = [];
  private checkedSubmissions: string[] = [];

  constructor(private _store: Store, private dialog: MatDialog) {
    _store.select(state => state.postybirb.editing).pipe(debounceTime(50)).subscribe((editing: SubmissionArchive[]) => {
      this.archives = editing;
    });
  }

  public bulkUpdate(update: SubmissionArchive): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.archives.length) {
        const dialogRef = this.dialog.open(BulkUpdateDialogComponent, {
          data: {
            archives: this.archives,
            selected: this.checkedSubmissions
          }
        });

        dialogRef.afterClosed().subscribe((result: string[]) => {
          if (result && result.length > 0) {
            const selectedSubmissions = this.archives.filter(archive => result.includes(archive.meta.id));
            this._store.dispatch(selectedSubmissions.map(archive => {
              archive.descriptionInfo = update.descriptionInfo;
              archive.optionInfo = update.optionInfo;
              archive.tagInfo = update.tagInfo;
              archive.meta.unpostedWebsites = update.meta.unpostedWebsites;

              return new PostyBirbStateAction.UpdateSubmission(archive);
            })).subscribe(() => {
              resolve();
            });
          } else {
            reject();
          }
        });
      }
    });
  }

  public selected(id: string, checked: boolean): void {
    const index = this.checkedSubmissions.indexOf(id);
    if (checked) {
      if (index === -1) this.checkedSubmissions.push(id);
    } else {
      if (index !== -1) this.checkedSubmissions.splice(index, 1);
    }
  }
}
