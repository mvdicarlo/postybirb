import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { readFile, ReadFile } from 'src/app/utils/helpers/file-reader.helper';
import { CollectSubmissionInfoDialog } from '../../components/collect-submission-info-dialog/collect-submission-info-dialog.component';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { SubmissionFileDBService } from 'src/app/database/model-services/submission-file.service';
import { SubmissionType, ISubmission, SubmissionRating } from 'src/app/database/tables/submission.table';
import { SubmissionFileType, asFileObject, ISubmissionFile } from 'src/app/database/tables/submission-file.table';
import { Submission } from 'src/app/database/models/submission.model';
import { Subscription } from 'rxjs';
import { InputDialog } from 'src/app/utils/components/input-dialog/input-dialog.component';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { TabManager } from '../../services/tab-manager.service';

export interface ModifiedReadFile extends ReadFile {
  title?: string;
  rating?: string;
  schedule?: Date;
  height?: number;
  width?: number;
  originalWidth?: number;
  originalHeight?: number;
}

@Component({
  selector: 'postybirb-layout',
  templateUrl: './postybirb-layout.component.html',
  styleUrls: ['./postybirb-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostybirbLayout implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef;

  get submissions(): Submission[] {
    if (this.searchControl.value) {
      const filter: string = this.searchControl.value.toLowerCase();
      return this._submissions.filter(s => (s.title || '').toLowerCase().includes(filter));
    }

    return this._submissions;
  }
  set submissions(submissions: Submission[]) { this._submissions = submissions || [] }
  private _submissions: Submission[] = [];

  public loading: boolean = false;
  public searchControl: FormControl = new FormControl();
  private submissionUpdatesSubscription: Subscription = Subscription.EMPTY;

  constructor(
    private _route: Router,
    private dialog: MatDialog,
    private _submissionCache: SubmissionCache,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDBService: SubmissionFileDBService,
    public _tabManager: TabManager,
    private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this._submissionDB.getSubmissions()
      .then(submissions => {
        this.submissions = submissions;
        this._changeDetector.detectChanges();
      });

      this.submissionUpdatesSubscription = this._submissionDB.changes.subscribe(() => {
        this._submissionDB.getSubmissions()
          .then(submissions => {
            this.submissions = submissions;
            this._changeDetector.detectChanges();
          });
      });
  }

  ngOnDestroy() {
    this.submissionUpdatesSubscription.unsubscribe();
  }

  public createNewSubmission(submissionFiles: ReadFile[] = []): void {
    if (submissionFiles && submissionFiles.length) {
      this.dialog.open(CollectSubmissionInfoDialog, {
        data: submissionFiles,
        minWidth: '50vw'
      }).afterClosed()
        .subscribe((results: ModifiedReadFile[]) => {
          if (results && results.length) {
            this.loading = true;
            this._changeDetector.markForCheck();
            this._submissionDB.createSubmissions(
              <ISubmission[]>results.map(result => {
                return <ISubmission>{
                  id: undefined,
                  title: result.title,
                  rating: result.rating,
                  schedule: null,
                  submissionType: SubmissionType.SUBMISSION,
                  fileInfo: asFileObject(result.file)
                }
              })
            ).then(insertResults => {
              // I assume insertResults comes down in orderBy id
              const promises: Promise<any>[] = [];
              for (let i = 0; i < insertResults.length; i++) {
                promises.push(this._submissionFileDBService.createSubmissionFiles(insertResults[i].id, SubmissionFileType.PRIMARY_FILE, [results[i]]));
              }

              Promise.all(promises)
                .then((submissionFiles: ISubmissionFile[][]) => {
                  this.loading = false;

                  let flat = [];
                  submissionFiles.forEach(f => { flat = [...flat, ...f] });

                  // cache and build file mapping
                  insertResults.forEach(r => this._submissionCache.store(r));
                  for (let i = 0; i < flat.length; i++) {
                      insertResults[i].fileMap = {
                        [SubmissionFileType.PRIMARY_FILE]: flat[i].id
                      }

                      if (insertResults[i].fileInfo.size != flat[i].fileInfo.size) {
                        insertResults[i].fileInfo = flat[i].fileInfo;
                      }
                  }

                  this.submissions = [...this.submissions, ...insertResults];
                  this._changeDetector.markForCheck();
                });
            });
          } else {
            this.loading = false;
            this._changeDetector.markForCheck();
          }
        });
    }
  }

  public createNewJournal(): void {
    this.loading = true;
    this._changeDetector.markForCheck();

    this.dialog.open(InputDialog, {
      data: {
        title: 'Title',
        minLength: 1,
        maxLength: 50
      }
    })
    .afterClosed()
    .subscribe(title => {
      if (title && title.trim().length) {
        this._submissionDB.createSubmissions([{
          id: undefined,
          title: title.trim(),
          rating: SubmissionRating.GENERAL,
          submissionType: SubmissionType.JOURNAL
        }]).then(insertResults => {
          this.loading = false;
          this.submissions = [...this.submissions, ...insertResults];
          this._changeDetector.markForCheck();
        })
      } else {
        this.loading = false;
        this._changeDetector.markForCheck();
      }
    });
  }

  public filesSelected(event: Event): void {
    event.stopPropagation()
    event.preventDefault();
    this.loading = true;
    this._changeDetector.markForCheck();

    const files: File[] = event.target['files'];

    if (files && files.length) {
      const loadPromises: Promise<ReadFile>[] = [];
      for (let i = 0; i < files.length; i++) {
        loadPromises.push(readFile(files[i]));
      }

      Promise.all(loadPromises)
        .then(results => {
          this.loading = false;
          this._changeDetector.markForCheck();
          this.createNewSubmission(results);
        });
    } else {
      this.loading = false;
      this._changeDetector.markForCheck();
    }

    this.fileInput.nativeElement.value = '';
  }

}
