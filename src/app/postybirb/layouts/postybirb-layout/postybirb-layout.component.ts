import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';
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
import { Router, NavigationEnd } from '@angular/router';
import { PostQueueService } from '../../services/post-queue.service';
import { SubmissionSelectDialog } from '../../components/submission-select-dialog/submission-select-dialog.component';

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
  public queuedSubmissions: Submission[] = [];

  public loading: boolean = false;
  public hideRoute: boolean = true;
  public cacheCompleted: boolean = false;
  public searchControl: FormControl = new FormControl();
  private submissionUpdatesListener: Subscription = Subscription.EMPTY;
  private queueListener: Subscription = Subscription.EMPTY;

  constructor(
    private _router: Router,
    private dialog: MatDialog,
    private _submissionCache: SubmissionCache,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDBService: SubmissionFileDBService,
    public _tabManager: TabManager,
    public _postQueue: PostQueueService,
    private _changeDetector: ChangeDetectorRef
  ) {

  }

  ngOnInit() {
    this.loading = true;
    this._submissionDB.getSubmissions()
      .then(submissions => {
        this.submissions = submissions;
        this.cacheCompleted = true;
        this.loading = false;
        this.hideRoute = false;
        this._changeDetector.detectChanges();

        this._router.events.subscribe(event => {
          if (event instanceof NavigationEnd) {
            this.hideRoute = true;
            this._changeDetector.detectChanges();
            this.hideRoute = false;
            this._changeDetector.detectChanges();
            this._changeDetector.markForCheck();
          }
        });
      });

    this.submissionUpdatesListener = this._submissionDB.changes.subscribe(() => {
      this._submissionDB.getSubmissions()
        .then(submissions => {
          this.submissions = submissions;
          this._changeDetector.detectChanges();
        });
    });

    this.queueListener = this._postQueue.changes.subscribe(queued => {
      this.queuedSubmissions = [...queued];
      this._changeDetector.detectChanges();
    });
  }

  ngOnDestroy() {
    this.submissionUpdatesListener.unsubscribe();
    this.queueListener.unsubscribe();
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

  public clipboardIsEligible(): boolean {
    return getClipboardFormats().includes('image/png');
  }

  public createSubmissionFromClipboard(): void {
    const { availableFormats, content } = readClipboard();

    if (availableFormats.includes('image/png')) {
      const buffer: Uint8Array = new Uint8Array(content.toJPEG(100));
      this.createNewSubmission([{
        buffer,
        file: <any>{
          size: buffer.length,
          name: 'unknown.jpeg',
          type: 'image/jpeg'
        }
      }]);
    }
  }

  public deleteMany(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Delete',
        multiple: true
      }
    }).afterClosed()
      .subscribe(deletes => {
        if (deletes.length) {
          this.loading = true;
          this._changeDetector.markForCheck();
          deletes.forEach(d => {
            const deletedSubmission = this._submissionCache.get(d.id);
            deletedSubmission.queued = false;
            deletedSubmission.cleanUp();
            this._tabManager.removeTab(d.id);
          });

          this._submissionDB.delete(deletes.map(d => d.id))
            .then()
            .catch()
            .finally(() => {
              this.loading = false;
              this._changeDetector.markForCheck();
            });
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

  public hasPostableSubmissions(): boolean {
    for (let i = 0; i < this.submissions.length; i++) {
      if (this.submissions[i].problems.length === 0) {
        return true;
      }
    }

    return false;
  }

}
