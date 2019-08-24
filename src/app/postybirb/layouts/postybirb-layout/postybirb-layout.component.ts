import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog, MatDialogRef, MatDrawer } from '@angular/material';
import { FileMetadata, readFileMetadata } from 'src/app/utils/helpers/file-reader.helper';
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
import { ScheduledSubmissionManagerService } from '../../services/scheduled-submission-manager.service';
import { ConfirmDialog } from 'src/app/utils/components/confirm-dialog/confirm-dialog.component';
import { arrayBufferAsBlob } from 'src/app/utils/helpers/file.helper';
import { copyObject } from 'src/app/utils/helpers/copy.helper';
import { QueueInserterService } from '../../services/queue-inserter.service';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { FileDropWatcherService } from '../../services/file-drop-watcher.service';
import { FileDropDialog } from '../../components/file-drop-dialog/file-drop-dialog.component';
import { SnotifyService } from 'ng-snotify';
import { SubmissionState } from 'src/app/database/services/submission-state.service';

@Component({
  selector: 'postybirb-layout',
  templateUrl: './postybirb-layout.component.html',
  styleUrls: ['./postybirb-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostybirbLayout implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('drawer') drawer: MatDrawer;
  private creatingJournal: boolean = false;

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
  public scheduledSubmissions: Submission[] = [];

  get editableSubmissions(): Submission[] {
    if (this.searchControl.value) {
      const filter: string = this.searchControl.value.toLowerCase();
      return this._editableSubmissions.filter(s => (s.title || '').toLowerCase().includes(filter));
    }

    return this._editableSubmissions;
  }
  set editableSubmissions(submissions: Submission[]) { this._editableSubmissions = submissions || [] }
  private _editableSubmissions: Submission[] = [];

  get queuedOrScheduled(): Submission[] {
    return [...this.queuedSubmissions, ...this.scheduledSubmissions].sort((a, b) => {
      const aDate = new Date(a.schedule);
      const bDate = new Date(b.schedule);

      if (aDate < bDate) return -1;
      if (aDate > bDate) return 1;
      return 0;
    });
  }

  public loading: boolean = false;
  public hideScrollTop: boolean = true;
  public hideRoute: boolean = true;
  public cacheCompleted: boolean = false;
  public searchControl: FormControl = new FormControl();
  private submissionUpdatesListener: Subscription = Subscription.EMPTY;
  private queueListener: Subscription = Subscription.EMPTY;

  private dragWindow: MatDialogRef<any>;

  constructor(
    private _router: Router,
    private dialog: MatDialog,
    private _submissionCache: SubmissionCache,
    private _submissionState: SubmissionState,
    private _submissionDB: SubmissionDBService,
    private _submissionFileDBService: SubmissionFileDBService,
    public _tabManager: TabManager,
    public _postQueue: PostQueueService,
    public _queueInserter: QueueInserterService,
    private _changeDetector: ChangeDetectorRef,
    private _hotkeyService: HotkeysService,
    private snotify: SnotifyService,
    _fileDropService: FileDropWatcherService,
    _scheduler: ScheduledSubmissionManagerService // only called so it will be instantiated
  ) {
    _fileDropService.onDrop.subscribe(files => {
      this._handleFiles(files);
    });

    _fileDropService.onDragStateChange.subscribe(dragging => {
      if (dragging) {
        if (!this.dragWindow) {
          this.dragWindow = this.dialog.open(FileDropDialog, {
            height: '50vh',
            width: '50vw',
            panelClass: 'transparent-dialog'
          });
        }
      } else {
        if (this.dragWindow) {
          this.dragWindow.close();
          this.dragWindow = null;
        }
      }
    });
  }

  ngOnInit() {
    this.loading = true;

    this._submissionState.noPostingState.subscribe(submissions => {
      this.editableSubmissions = submissions;
      this._changeDetector.detectChanges();
    });

    this._submissionState.scheduled.subscribe(submissions => {
      this.scheduledSubmissions = submissions;
      this._changeDetector.detectChanges();
    });

    this._postQueue.changes.subscribe(submissions => {
      this.queuedSubmissions = submissions;
      this._changeDetector.detectChanges();
    })

    this._submissionDB.onInitialized.subscribe(isInitialized => {
      if (isInitialized) {
        this.submissions = this._submissionCache.getAll();
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

        this.submissionUpdatesListener = this._submissionState.onSubmissionPublish.subscribe(submissions => {
          this.submissions = [...submissions];
          this._changeDetector.detectChanges();
        });
      }
    });
  }

  ngAfterViewInit() {
    this._hotkeyService.add(new Hotkey(['ctrl+t', 'command+t'], (event: KeyboardEvent) => {
      this._router.navigate(['/template']);
      return false;
    }, undefined, 'Opens Template form.'));

    this._hotkeyService.add(new Hotkey(['ctrl+b', 'command+b'], (event: KeyboardEvent) => {
      this._router.navigate(['/bulk']);
      return false;
    }, undefined, 'Opens Bulk Update form.'));

    this._hotkeyService.add(new Hotkey(['ctrl+l', 'command+l'], (event: KeyboardEvent) => {
      this._router.navigate(['/logs']);
      return false;
    }, undefined, 'Opens Logs section.'));

    this._hotkeyService.add(new Hotkey(['ctrl+n+s', 'command+n+s'], (event: KeyboardEvent) => {
      if (this.fileInput && !this.loading) {
        this.fileInput.nativeElement.click();
      }
      return false;
    }, undefined, 'Create new submission.'));

    this._hotkeyService.add(new Hotkey(['ctrl+n+j', 'command+n+j'], (event: KeyboardEvent) => {
      if (!this.creatingJournal) this.createNewJournal();
      return false;
    }, undefined, 'Create new journal.'));
  }

  ngOnDestroy() {
    this.submissionUpdatesListener.unsubscribe();
    this.queueListener.unsubscribe();
  }

  public async scrolled(event: any) {
    event.stopPropagation();
    if (event.target.scrollTop >= Math.min(event.target.offsetHeight * .15, 150)) {
      if (this.hideScrollTop) {
        this.hideScrollTop = false;
        this._changeDetector.markForCheck();
      }
    } else {
      if (!this.hideScrollTop) {
        this.hideScrollTop = true;
        this._changeDetector.markForCheck();
      }
    }
  }

  public cancelAllQueued(): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cancel All'
      }
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this.queuedOrScheduled
            .forEach(qs => this._queueInserter.dequeue(qs));
        }
      });
  }

  public createNewSubmission(submissionFiles: FileMetadata[] = []): void {
    if (submissionFiles && submissionFiles.length) {
      this.dialog.open(CollectSubmissionInfoDialog, {
        data: submissionFiles,
        minWidth: '50vw'
      }).afterClosed()
        .subscribe((results: FileMetadata[]) => {
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
                  fileInfo: asFileObject(result.file),
                  formData: copyObject(result.formData || {}) // ensure no shared reference
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
                      [SubmissionFileType.PRIMARY_FILE]: flat[i].id,
                      [SubmissionFileType.THUMBNAIL_FILE]: null,
                      [SubmissionFileType.ADDITIONAL_FILE]: [],
                    }

                    if (insertResults[i].fileInfo.size != flat[i].fileInfo.size) {
                      insertResults[i].fileInfo = flat[i].fileInfo;
                    }
                  }

                  // this.submissions = [...this.submissions, ...insertResults];
                  this._changeDetector.markForCheck();

                  this._openToTab(insertResults[0]);
                });
            });
          } else {
            this.loading = false;
            this._changeDetector.markForCheck();
          }
        });
    }
  }

  public async reviveSubmission(reviver: ISubmission): Promise<void> {
    this.loading = true;
    const revive: ISubmission = copyObject(reviver);
    revive.id = undefined;
    let file: File;
    if (revive.submissionType === SubmissionType.SUBMISSION) {
      revive.fileMap = {
        PRIMARY: -1,
        THUMBNAIL: null,
        ADDITIONAL: []
      };

      try {
        const response = await fetch(revive.fileInfo.path);
        const blob = await response.blob();
        file = new File([blob], revive.fileInfo.name, { type: blob.type });
      } catch (e) {
        this.snotify.warning(`Unable to revive file: ${revive.fileInfo.name}`);
      }
      if (!file) {
        revive.fileInfo = {
          name: 'unknown',
          size: 0,
          path: '',
          type: ''
        };
      }

    }

    if (revive.formData) {
      const websites = [...revive.postStats.fail, ...revive.postStats.success].sort();
      revive.formData.websites = [];
      websites.forEach(w => {
        if (!revive.formData.websites.includes(w)) revive.formData.websites.push(w);
      });
    }

    this._submissionDB.createSubmissions([revive]).then(insertResults => {
      if (revive.submissionType === SubmissionType.JOURNAL) {
        this.loading = false;
        // this.submissions = [...this.submissions, ...insertResults];
        this._changeDetector.markForCheck();

        this._openToTab(insertResults[0]);
      } else {
        const promises: Promise<any>[] = [];
        for (let i = 0; i < insertResults.length; i++) {
          promises.push(this._submissionFileDBService.createSubmissionFiles(insertResults[i].id, SubmissionFileType.PRIMARY_FILE, [{
            file: file ? file : new File([new Uint8Array()], 'unknown'),
            buffer: null
          }]));
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
                [SubmissionFileType.PRIMARY_FILE]: flat[i].id,
                [SubmissionFileType.THUMBNAIL_FILE]: null,
                [SubmissionFileType.ADDITIONAL_FILE]: [],
              }

              if (insertResults[i].fileInfo.size != flat[i].fileInfo.size) {
                insertResults[i].fileInfo = flat[i].fileInfo;
              }
            }

            // this.submissions = [...this.submissions, ...insertResults];
            this._changeDetector.markForCheck();

            this._openToTab(insertResults[0]);
          });
      }
    });
  }

  public createNewJournal(): void {
    this.loading = true;
    this.creatingJournal = true;
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
            this.creatingJournal = false;
            // this.submissions = [...this.submissions, ...insertResults];
            this._changeDetector.markForCheck();

            this._openToTab(insertResults[0]);
          });
        } else {
          this.loading = false;
          this.creatingJournal = false;
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
      const size = content.getSize();
      const file: any = arrayBufferAsBlob(buffer, 'image/jpeg')
      file.name = 'unknown.jpeg';

      this.createNewSubmission([{
        buffer,
        file,
        originalWidth: size.width,
        originalHeight: size.height,
        width: size.width,
        height: size.height,
        isImage: true,
        isGIF: false
      }]);
    }
  }

  public deleteMany(): void {
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Delete',
        multiple: true,
        submissions: this.editableSubmissions
      }
    }).afterClosed()
      .subscribe(deletes => {
        if (deletes && deletes.length) {
          this.loading = true;
          this._changeDetector.markForCheck();
          deletes.forEach(d => {
            const deletedSubmission = this._submissionCache.get(d.id);
            this._queueInserter.dequeue(deletedSubmission);
            deletedSubmission.cleanUp();
            if (this._tabManager.hasTab(d.id)) this._tabManager.removeTab(d.id);
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

    const files: File[] = event.target['files'];

    if (files && files.length) {
      this._handleFiles(files);
    }

    this.fileInput.nativeElement.value = '';
  }

  private _handleFiles(files: File[] | FileList): void {
    this.loading = true;
    this._changeDetector.markForCheck();

    const loadPromises: Promise<FileMetadata>[] = [];
    for (let i = 0; i < files.length; i++) {
      loadPromises.push(readFileMetadata(files[i]));
    }

    Promise.all(loadPromises)
      .then(results => {
        this.loading = false;
        this._changeDetector.markForCheck();
        this.createNewSubmission(results);
      });

    this.loading = false;
    this._changeDetector.markForCheck();
  }

  public hasPostableSubmissions(): boolean {
    for (let i = 0; i < this.submissions.length; i++) {
      if (this.submissions[i].problems.length === 0) {
        return true;
      }
    }

    return false;
  }

  public postMany(): void {
    this.loading = true;
    this._changeDetector.markForCheck();
    this.dialog.open(SubmissionSelectDialog, {
      data: {
        title: 'Post',
        multiple: true,
        allowReorder: true,
        submissions: this._postableSubmissions()
      }
    }).afterClosed()
      .subscribe(results => {
        if (results && results.length) {
          results
            .forEach((submission: ISubmission) => this._queueInserter.queue(this._submissionCache.get(submission.id)));
        }

        this.loading = false;
        this._changeDetector.markForCheck();
      });
  }

  private _openToTab(submission: Submission): void {
    if (submission) {
      this._tabManager.addTab(submission);
    }
  }

  private _postableSubmissions(): Submission[] {
    return this.submissions
      .filter(s => !s.queued)
      .filter(s => !s.isScheduled)
      .filter(s => s.problems.length === 0);
  }

}
